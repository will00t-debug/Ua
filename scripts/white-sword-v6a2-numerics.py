#!/usr/bin/env python3
"""SVD rank, linear-program feasibility, and a fixed-budget clipped hinge fit."""
import json
import sys
import numpy as np
from scipy.optimize import linprog

CLIP = 18.0
EPS = 1e-4

def svd_rank(matrix):
    array = np.asarray(matrix, dtype=float)
    if array.size == 0:
        return {"rank": 0, "tolerance": 0, "largest": 0, "smallest": 0}
    singular = np.linalg.svd(array, compute_uv=False)
    largest = float(singular[0]) if singular.size else 0.0
    tolerance = float(np.finfo(float).eps * max(array.shape) * largest) if largest else 0.0
    rank = int(np.sum(singular > tolerance))
    return {
        "rank": rank,
        "tolerance": tolerance,
        "largest": largest,
        "smallest": float(singular[-1]) if singular.size else 0.0,
    }

def solve_lp(problem):
    cost = np.zeros(problem["variables"])
    bounds = [(None, None)] * problem["variables"]
    result = linprog(
        cost,
        A_ub=np.asarray(problem["A"], dtype=float),
        b_ub=np.asarray(problem["b"], dtype=float),
        bounds=bounds,
        method="highs",
        options={"time_limit": problem.get("seconds", 10), "presolve": True},
    )
    status = {0: "found", 2: "infeasible"}.get(int(result.status), "undecided")
    beta = result.x.tolist() if result.x is not None and status == "found" else None
    return {"name": problem.get("name"), "status": status, "solver": int(result.status), "beta": beta}

def clip(value):
    return float(np.clip(value, -CLIP, CLIP))

def hinge_fit(spec):
    rows = spec["rows"]
    width = len(rows[0]["phiA"])
    lambdas = spec["lambdas"]
    steps = int(spec["steps"])
    rate = float(spec["rate"])
    def loss_and_grad(beta, subset, penalty):
        gradient = penalty * beta
        total = 0.5 * penalty * float(beta @ beta)
        weight = 0.0
        for row in subset:
            phi_a = np.asarray(row["phiA"], dtype=float)
            phi_b = np.asarray(row["phiB"], dtype=float)
            dot_a = float(phi_a @ beta)
            dot_b = float(phi_b @ beta)
            residual_a = clip(dot_a)
            residual_b = clip(dot_b)
            gap = (row["blendA"] + residual_a) - (row["blendB"] + residual_b)
            margin = row["y"] * gap
            weight += row["weight"]
            if margin < 0:
                total += row["weight"] * (-margin)
                if abs(dot_a) < CLIP:
                    gradient = gradient - row["weight"] * row["y"] * phi_a
                if abs(dot_b) < CLIP:
                    gradient = gradient + row["weight"] * row["y"] * phi_b
        return total / max(weight, 1.0), gradient / max(weight, 1.0)
    def fit(subset, penalty):
        beta = np.zeros(width)
        for _ in range(steps):
            _, gradient = loss_and_grad(beta, subset, penalty)
            beta = beta - rate * gradient
        return beta
    folds = sorted({row["fold"] for row in rows})
    best = None
    for penalty in lambdas:
        losses = []
        for fold in folds:
            held = [row for row in rows if row["fold"] == fold]
            train = [row for row in rows if row["fold"] != fold]
            if not held or not train:
                continue
            beta = fit(train, penalty)
            loss, _ = loss_and_grad(beta, held, penalty)
            losses.append(loss)
        if not losses:
            continue
        score = float(np.mean(losses))
        if best is None or score < best["loss"] - 1e-12 or (abs(score - best["loss"]) <= 1e-12 and penalty > best["lambda"]):
            best = {"lambda": penalty, "loss": score}
    beta = fit(rows, best["lambda"])
    return {"lambda": best["lambda"], "beta": beta.tolist(), "trainLoss": best["loss"]}

def main():
    request = json.load(sys.stdin)
    response = {}
    if "svd" in request:
        response["svd"] = svd_rank(request["svd"])
    if "lps" in request:
        response["lps"] = [solve_lp(problem) for problem in request["lps"]]
    if "hinge" in request:
        response["hinge"] = hinge_fit(request["hinge"])
    json.dump(response, sys.stdout)

if __name__ == "__main__":
    main()
