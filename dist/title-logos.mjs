// Logos are genuine title wordmarks, not representative card art.
// Attribution/source pages: Wikimedia Commons. Trademark ownership stays
// with the respective series' rights holders. Files are loaded from Wikimedia
// rather than copied into the card/engine data or serialized into decks.
export const TITLE_LOGOS=Object.freeze({
 bleach:Object.freeze({
  image:'https://upload.wikimedia.org/wikipedia/commons/8/85/Bleach_Thousand-Year_Blood_War_Logo.svg',
  label:'BLEACH 千年血戰篇',
  source:'https://commons.wikimedia.org/wiki/File:Bleach_Thousand-Year_Blood_War_Logo.svg',
  credit:'Tite Kubo／Shueisha・TV Tokyo・Dentsu・Pierrot',
  license:'CC BY-SA 4.0',
  licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'
 }),
 'gurren-lagann':Object.freeze({
  image:'https://upload.wikimedia.org/wikipedia/commons/3/38/Tengen_Toppa_Gurren_Lagann_logo.svg',
  label:'天元突破 紅蓮螺巖',
  source:'https://commons.wikimedia.org/wiki/File:Tengen_Toppa_Gurren_Lagann_logo.svg',
  credit:'中島かずき・今石洋之・プロジェクト「グレンラガン」',
  license:'PD text logo'
 }),
 'sword-art-online':Object.freeze({
  image:'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sword_Art_Online_anime_logo.svg',
  label:'刀劍神域',
  source:'https://commons.wikimedia.org/wiki/File:Sword_Art_Online_anime_logo.svg',
  credit:'Sword Art Online rights holders',
  license:'PD text logo'
 }),
 'solo-leveling':Object.freeze({
  image:'https://upload.wikimedia.org/wikipedia/commons/f/f4/Solo_Leveling_logo.svg',
  label:'我獨自升級',
  source:'https://commons.wikimedia.org/wiki/File:Solo_Leveling_logo.svg',
  credit:'Solo Leveling rights holders',
  license:'PD text logo'
 }),
 'mushoku-tensei':Object.freeze({
  image:'https://upload.wikimedia.org/wikipedia/commons/f/f4/Mushoku_Tensei_international_logo_%28with_colour_gradient%29.svg',
  label:'無職轉生',
  source:'https://commons.wikimedia.org/wiki/File:Mushoku_Tensei_international_logo_(with_colour_gradient).svg',
  credit:'Mushoku Tensei rights holders',
  license:'PD text logo'
 }),
 rezero:Object.freeze({
  image:'https://upload.wikimedia.org/wikipedia/commons/c/cb/Re_Zero_kara_Hajimeru_Isekai_Seikatsu_logo.svg',
  label:'Re:從零開始的異世界生活',
  source:'https://commons.wikimedia.org/wiki/File:Re_Zero_kara_Hajimeru_Isekai_Seikatsu_logo.svg',
  credit:'Re:Zero rights holders',
  license:'PD text logo'
 }),
 'steins-gate':Object.freeze({
  image:'https://upload.wikimedia.org/wikipedia/commons/b/b2/Steins%3BGate.svg',
  label:'命運石之門',
  source:'https://commons.wikimedia.org/wiki/File:Steins;Gate.svg',
  credit:'志倉千代丸',
  license:'PD text logo'
 }),
 madoka:Object.freeze({
  image:'https://upload.wikimedia.org/wikipedia/commons/8/84/Mah%C5%8D_Sh%C5%8Djo_Madoka_Magika_%28Logo%29.svg',
  label:'魔法少女小圓',
  source:'https://commons.wikimedia.org/wiki/File:Mah%C5%8D_Sh%C5%8Djo_Madoka_Magika_(Logo).svg',
  credit:'Magica Quartet／Aniplex・Madoka Partners・MBS',
  license:'PD text logo'
 }),
 inuyasha:Object.freeze({
  image:'https://upload.wikimedia.org/wikipedia/commons/8/8f/InuYashaLogoBlueRay.svg',
  label:'犬夜叉',
  source:'https://commons.wikimedia.org/wiki/File:InuYashaLogoBlueRay.svg',
  credit:'高橋留美子／小学館・読売テレビ・サンライズ',
  license:'PD text logo'
 })
});
export const titleLogo=id=>Object.hasOwn(TITLE_LOGOS,id)?TITLE_LOGOS[id]:null;
