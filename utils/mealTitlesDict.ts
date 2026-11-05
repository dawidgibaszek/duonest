/**
 * Słownik i silnik tłumaczeń nazw dań i przepisów kulinarnych na język polski (EN -> PL).
 * Zawiera zarówno słownik znanych dań TheMealDB, jak i reguły gramatyczne dla dowolnych innych przepisów.
 */

export const EXACT_MEAL_TITLES_PL: Record<string, string> = {
  // Wołowina
  'Beef and Broccoli Stir-Fry': 'Wołowina stir-fry z brokułami',
  'Beef and Mustard Pie': 'Zapiekanka wołowa z musztardą',
  'Beef and Oyster pie': 'Tarta wołowa z ostrygami',
  'Beef Asado': 'Pieczeń wołowa Asado',
  'Beef Banh Mi Bowls with Sriracha Mayo, Carrot & Pickled Cucumber': 'Miska wołowa Banh Mi z piklami i sosem sriracha',
  'Beef Bourguignon': 'Wołowina po burgundzku',
  'Beef Brisket Pot Roast': 'Pieczeń duszona z mostka wołowego',
  'Beef Caldereta': 'Filipiński gulasz wołowy Caldereta',
  'Beef Dumpling Stew': 'Gulasz wołowy z kluskami',
  'Beef Empanadas': 'Empanadas z wołowiną',
  'Beef Lo Mein': 'Smażony makaron Lo Mein z wołowiną',
  'BEEF LOK LAK (Lok Lak Sach Ko)': 'Wołowina Lok Lak w sosie pieprzowo-limonkowym',
  'Beef Mandi': 'Jemeński ryż Mandi z wołowiną',
  'Beef Mechado': 'Filipińska duszona wołowina Mechado',
  'Beef pho': 'Wietnamska zupa Pho z wołowiną',
  'Beef pumpkin Stew': 'Gulasz wołowy z dynią',
  'Beef Rendang': 'Indonezyjska wołowina Rendang w mleku kokosowym',
  'Beef stroganoff': 'Boeuf Stroganow',
  'Beef Stroganoff': 'Boeuf Stroganow',
  'Beef Sunday Roast': 'Niedzielna pieczeń wołowa',
  'Beef Wellington': 'Polędwica Wellington w cieście francuskim',
  'Belgian Meatballs in Liège Syrup Sauce': 'Belgijskie pulpety w syropie z Liège',
  'Big Mac': 'Domowy burger w stylu Big Mac',
  "Bigos (Polish hunter's stew)": 'Bigos staropolski',
  'Bistek': 'Filipiński stek wołowy Bistek',
  'Bitterballen (Dutch meatballs)': 'Holenderskie krokiety Bitterballen',
  'Bobotie': 'Południowoafrykańska zapiekanka Bobotie',
  'Boiled Beef with Horseradish Sauce': 'Sztukamięs wołowy z sosem chrzanowym',
  'Braised Beef Chilli': 'Duszona wołowina chilli',
  'Cevapi': 'Bałkańskie cevapcici z grilla',
  'Chilli con carne': 'Chili con carne z czerwoną fasolą',
  'Corned Beef and Cabbage': 'Peklowana wołowina z kapustą',
  'Corned Beef Hash': 'Zapiekanka z peklowaną wołowiną i ziemniakami',
  'Cottage Pie': 'Brytyjska zapiekanka wołowa Cottage Pie',
  'Egyptian Fatteh': 'Egipskie danie Fatteh z wołowiną i ryżem',
  'Irish Stew': 'Tradycyjny gulasz irlandzki',
  'Jamaican Beef Patties': 'Jamajskie pierożki z pikantną wołowiną',
  'Kefta Gandour': 'Marokańskie pulpety wołowe Kefta Gandour',
  'Massaman Beef Curry': 'Tajskie curry Massaman z wołowiną i ziemniakami',
  'Minced Beef Pie': 'Tarta z mięsem mielonym',
  'Montreal Smoked Meat': 'Kanapka z wędzoną wołowiną po montrealsku',
  'Moussaka': 'Grecka zapiekanka Moussaka z bakłażanem',
  'Mulukhiyah': 'Bliskowschodnia zupa Mulukhiyah',
  'Oxtail with broad beans': 'Ogon wołowy z młodym bobem',
  'Pate Chinois': 'Quebecka zapiekanka mięsna Pâté Chinois',
  'Red Peas Soup': 'Jamajska zupa z czerwonego groszku',
  'Roti john': 'Kanapka omletowa Roti John z wołowiną',
  'Rump Steak with Peppercorn Sauce': 'Stek z sosem z zielonego pieprzu',
  'Sate Babi': 'Indonezyjskie szaszłyki satay z sosem orzechowym',
  'Shakshuka': 'Szakszuka z pomidorami i jajkami',
  'Smoked Haddock Kedgeree': 'Ryż Kedgeree z wędzonym łupaczem',
  'Spaghetti Bolognese': 'Klasyczne Spaghetti Bolognese',
  'Steak and Kidney Pie': 'Tradycyjne ciasto z wołowiną i nerkami',
  'Steak Diane': 'Stek Diane w sosie maślano-koniakowym',
  'Szechuan Beef': 'Pikantna wołowina po seczuańsku',
  'Traditional Polish Golabki (Pork and Rice Stuffed Cabbage Rolls)': 'Tradycyjne gołąbki z mięsem i ryżem',
  'Vegetable Beef Goulash': 'Gulasz wołowo-warzywny',

  // Drób i kurczak
  'Ayam Percik': 'Malezyjski pieczony kurczak Ayam Percik',
  'Brown Stew Chicken': 'Karaibski duszony kurczak',
  'Chick-Fil-A Sandwich': 'Chrupiąca maślana kanapka z kurczakiem',
  'Chicken & mushroom Hotpot': 'Zapiekanka z kurczakiem i pieczarkami',
  'Chicken Alfredo Primavera': 'Makaron Alfredo z kurczakiem i warzywami',
  'Chicken Basquaise': 'Kurczak po baskijsku z papryką i pomidorami',
  'Chicken Cashew Nut': 'Wok z kurczakiem i orzechami nerkowca',
  'Chicken Congee': 'Azjatycki kleik ryżowy Congee z kurczakiem',
  'Chicken Couscous': 'Kuskus z kurczakiem i warzywami',
  'Chicken Enchilada Casserole': 'Zapiekanka enchilada z kurczakiem i serem',
  'Chicken Fajitas': 'Fajitas z kurczakiem i kolorową papryką',
  'Chicken Ham and Leek Pie': 'Tarta z kurczakiem, szynką i porem',
  'Chicken Handi': 'Tradycyjny kurczak Handi w kremowym sosie',
  'Chicken Karaage': 'Japoński chrupiący kurczak Karaage',
  'Chicken Katsu': 'Chrupiący kotlet z kurczaka Katsu w panko',
  'Chicken Marengo': 'Kurczak Marengo w sosie pomidorowym',
  'Chicken Parmentier': 'Francuska zapiekanka Parmentier z kurczakiem',
  'Chicken Quinoa Greek Salad': 'Sałatka grecka z kurczakiem i komosą ryżową',
  'Coq au Vin': 'Kogut w czerwonym winie (Coq au Vin)',
  'Crock Pot Chicken Baked Tacos': 'Zapiekane tacos z szarpanym kurczakiem',
  'General Tso\'s Chicken': 'Chrupiący słodko-pikantny kurczak Generała Tso',
  'Honey Balsamic Chicken with Veggies': 'Kurczak balsamiczno-miodowy z pieczonymi warzywami',
  'Honey Teriyaki Salmon': 'Łosoś w słodkim sosie miodowo-teriyaki',
  'Hot and Sour Soup': 'Chińska zupa ostro-kwaśna',
  'Kung Pao Chicken': 'Kurczak Kung Pao z orzeszkami i chilli',
  'Kumpir': 'Turecki pieczony ziemniak Kumpir z dodatkami',
  'Nutty Chicken Curry': 'Aromatyczne curry z kurczakiem i orzechami',
  'Pad Thai': 'Tajski makaron ryżowy Pad Thai',
  'Piri-piri chicken and slaw': 'Pikantny kurczak Piri-Piri z surówką colesław',
  'Potato Gratin with Chicken': 'Zapiekanka ziemniaczana z kurczakiem i serem',
  'Rappie Pie': 'Tradycyjna zapiekanka ziemniaczana z kurczakiem (Rappie Pie)',
  'Roast chicken with creamy walnut sauce': 'Pieczony kurczak w kremowym sosie orzechowym',
  'Shawarma': 'Bliskowschodnia shawarma z kurczakiem w picie',
  'Smoky chicken skewers': 'Wędzone szaszłyki z kurczaka z grilla',
  'Tandoori Chicken': 'Kurczak Tandoori marynowany w jogurcie i przyprawach',
  'Teriyaki Chicken Casserole': 'Zapiekanka ryżowa z kurczakiem teriyaki',
  'Thai Green Curry': 'Tajskie zielone curry z kurczakiem i mlekiem kokosowym',

  // Ryby i owoce morza
  'Cajun spiced fish tacos': 'Tacos rybne z przyprawą cajun',
  'Chilli prawn linguine': 'Linguine z krewetkami i świeżym chilli',
  'Crispy Fish Goujons': 'Chrupiące paluszki rybne w złocistej panierce',
  'Fish and chips': 'Ryba z frytkami (Fish & Chips)',
  'Fish pie': 'Tradycyjna brytyjska zapiekanka rybna z puree',
  'Fish Stew with Tomatoes': 'Śródziemnomorska potrawka rybna w pomidorach',
  'Garlic Butter Shrimp': 'Krewetki smażone na maśle czosnkowym',
  'Grilled Salmon with Avocado Salsa': 'Grillowany łosoś z salsą z awokado',
  'Honey Glazed Salmon': 'Łosoś glazurowany miodem i sosem sojowym',
  'Kedgeree': 'Aromatyczny ryż Kedgeree z wędzoną rybą i jajkiem',
  'Laksa King Prawn': 'Malezyjska pikantna zupa Laksa z krewetkami królewskimi',
  'Mediterranean Pasta Salad': 'Śródziemnomorska sałatka makaronowa',
  'Mussels in White Wine': 'Małże (mule) duszone w białym winie i czosnku',
  'Prawn & Fennel Bisque': 'Krem bisque z krewetkami i fenkułem',
  'Salmon Avocado Salad': 'Sałatka ze świeżym łososiem i awokado',
  'Salmon Eggs Eggs Benedict': 'Jajka po benedyktyńsku z wędzonym łososiem',
  'Seafood Paella': 'Hiszpańska paella z owocami morza i szafranem',
  'Shrimp Chow Fun': 'Smażony makaron ryżowy Chow Fun z krewetkami',
  'Singapore Noodles with Shrimp': 'Makaron po singapursku z krewetkami',
  'Spanish meatballs with clams, chorizo & squid': 'Pulpety hiszpańskie z małżami, chorizo i kalmarami',
  'Tuna Nicoise': 'Klasyczna sałatka nicejska z tuńczykiem',

  // Wieprzowina
  'BBQ Pork Sloppy Joes': 'Burgery Sloppy Joe z szarpaną wieprzowiną BBQ',
  'Bacon and Lentil Soup': 'Zupa z soczewicy z chrupiącym boczkiem',
  'Crispy Pork Belly': 'Chrupiący pieczony boczek po azjatycku',
  'Pork Chops with Apple Sauce': 'Kotlety schabowe z musem jabłkowym',
  'Pork Tenderloin with Mustard Sauce': 'Polędwiczki wieprzowe w sosie musztardowym',
  'Pulled Pork Burgers': 'Burgery z szarpaną wieprzowiną',
  'Sweet and Sour Pork': 'Wieprzowina w sosie słodko-kwaśnym z ananasem',
  'Tonkatsu Pork': 'Japoński chrupiący schabowy Tonkatsu',
  'Vietnamese Caramel Pork': 'Wietnamska wieprzowina karmelizowana',
  'Vietnamese Grilled Pork (bun-thit-nuong)': 'Wietnamska grillowana wieprzowina Bun Thit Nuong',

  // Jagnięcina
  'Lamb Biryani': 'Aromatyczne biryani z jagnięciną i ryżem basmati',
  'Lamb Rogan Josh': 'Kaszmirskie curry jagnięce Rogan Josh',
  'Lamb Tagine with Apricots': 'Marokański tadżin jagnięcy z morelami',
  'Moroccan Lamb Tagine': 'Marokański tadżin z jagnięciny',
  'Shepherd\'s Pie': 'Tradycyjna zapiekanka pasterska z jagnięciną',
  'Stuffed Lamb Tomatoes': 'Pieczone pomidory faszerowane jagnięciną',

  // Makarony i Dania Główne
  'Arrabiata': 'Penne all\'Arrabbiata na ostro',
  'Fettuccine Alfredo': 'Makaron Fettuccine Alfredo w maślanym sosie',
  'Lasagne': 'Klasyczna domowa lasagne po bolońsku',
  'Lasagna': 'Klasyczna domowa lasagne po bolońsku',
  'Mushroom Risotto': 'Kremowe risotto z leśnymi grzybami',
  'Mushroom soup with buckwheat': 'Zupa grzybowa z kaszą gryczaną',
  'Pasta Carbonara': 'Włoskie Spaghetti Carbonara',
  'Penne all\'Arrabbiata': 'Penne all\'Arrabbiata w pikantnym sosie',
  'Pizza Margherita': 'Klasyczna Pizza Margherita',
  'Ratatouille': 'Tradycyjne francuskie Ratatouille warzywne',
  'Spinach and Feta Pie': 'Grecka Spanakopita ze szpinakiem i fetą',
  'Three-cheese souffles': 'Puszyste suflety z trzech rodzajów sera',
  'Vegetable Lasagna': 'Wegetariańska lasagne warzywna',

  // Desery
  'Apple & Blackberry Crumble': 'Kruszonka z jabłkami i jeżynami',
  'Apple Frangipan Tart': 'Tarta migdałowo-jabłkowa Frangipane',
  'Baklava': 'Tradycyjna baklawa z miodem i pistacjami',
  'Banana Pancakes': 'Pancakes bananowe z syropem klonowym',
  'Bread and Butter Pudding': 'Brytyjski pudding chlebowy z rodzynkami',
  'Carrot Cake': 'Aromatyczne ciasto marchewkowe z orzechami',
  'Cheesecake': 'Kremowy aksamitny sernik',
  'Chocolate Fondant': 'Lawa czekoladowa (Chocolate fondant)',
  'Chocolate Souffle': 'Puszysty suflet czekoladowy',
  'Classic Tiramisu': 'Klasyczne włoskie Tiramisu',
  'Creme Brulee': 'Krem Crème Brûlée z chrupiącą karmelową skorupką',
  'Key Lime Pie': 'Orzeźwiający placek Key Lime z limonkami',
  'New York Cheesecake': 'Pieczony nowojorski sernik',
  'Pancake': 'Naleśniki z nadzieniem',
  'Pancakes': 'Puszyste amerykańskie pancakes',
  'Passion fruit mousse': 'Puszysty mus z marakui',
  'Sticky Toffee Pudding': 'Ciepłe ciasto daktylowe z sosem toffi',
  'Tiramisu': 'Włoskie Tiramisu z biszkoptami i mascarpone',
  'Treacle Tart': 'Tradycyjna brytyjska tarta melasowa (Treacle Tart)',
  'Tourtiere': 'Tradycyjny quebecki pasztet mięsny Tourtière'
}

const INSTRUMENTAL_INGREDIENTS: Record<string, string> = {
  chicken: 'kurczakiem',
  beef: 'wołowiną',
  pork: 'wieprzowiną',
  lamb: 'jagnięciną',
  turkey: 'indykiem',
  duck: 'kaczką',
  salmon: 'łososiem',
  tuna: 'tuńczykiem',
  fish: 'rybą',
  seafood: 'owocami morza',
  prawn: 'krewetkami',
  prawns: 'krewetkami',
  shrimp: 'krewetkami',
  shrimps: 'krewetkami',
  mushroom: 'pieczarkami',
  mushrooms: 'pieczarkami / grzybami',
  potato: 'ziemniakami',
  potatoes: 'ziemniakami',
  'sweet potato': 'batatami',
  'sweet potatoes': 'batatami',
  spinach: 'szpinakiem',
  broccoli: 'brokułami',
  cauliflower: 'kalafiorem',
  cabbage: 'kapustą',
  tomato: 'pomidorami',
  tomatoes: 'pomidorami',
  cheese: 'serem',
  mustard: 'musztardą',
  apple: 'jabłkami',
  apples: 'jabłkami',
  blackberry: 'jeżynami',
  strawberry: 'truskawkami',
  strawberries: 'truskawkami',
  lemon: 'cytryną',
  lime: 'limonką',
  bacon: 'boczkiem',
  ham: 'szynką',
  garlic: 'czosnkiem',
  onion: 'cebulą',
  onions: 'cebulą',
  fennel: 'fenkułem',
  coconut: 'kokosem',
  peas: 'groszkiem',
  beans: 'fasolą',
  lentils: 'soczewicą',
  walnuts: 'orzechami włoskimi',
  almonds: 'migdałami'
}

const SOUP_TYPES: Record<string, string> = {
  mushroom: 'grzybowa',
  tomato: 'pomidorowa',
  onion: 'cebulowa',
  'french onion': 'cebulowa po francusku',
  potato: 'ziemniaczana',
  chicken: 'z kurczakiem (rosół)',
  beef: 'wołowa',
  fish: 'rybna',
  seafood: 'z owocami morza',
  lentil: 'z soczewicy',
  bean: 'fasolowa',
  vegetable: 'warzywna',
  broccoli: 'brokułowa',
  cauliflower: 'kalafiorowa',
  pumpkin: 'dyniowa',
  cabbage: 'z kapusty (kapuśniak)',
  leek: 'porowa'
}

const SALAD_TYPES: Record<string, string> = {
  potato: 'ziemniaczana',
  chicken: 'z kurczakiem',
  tuna: 'z tuńczykiem',
  salmon: 'z łososiem',
  pasta: 'makaronowa',
  greek: 'grecka',
  caesar: 'Cezar',
  fruit: 'owocowa',
  cabbage: 'z kapusty (surówka)'
}

const CAKE_TYPES: Record<string, string> = {
  carrot: 'marchewkowe',
  chocolate: 'czekoladowe',
  lemon: 'cytrynowe',
  apple: 'jabłkowe (szarlotka)',
  banana: 'bananowe',
  coffee: 'kawowe',
  cheese: 'sernik',
  christmas: 'świąteczne'
}

const MEATBALL_TYPES: Record<string, string> = {
  swedish: 'po szwedzku',
  italian: 'po włosku',
  spanish: 'po hiszpańsku',
  beef: 'wołowe',
  pork: 'wieprzowe',
  chicken: 'drobiowe'
}

const PROCEDURAL_REPLACEMENTS: [RegExp, string][] = [
  [/\bRecipe\b/gi, ''],
  [/\bAir fryer\b/gi, 'z frytkownicy beztłuszczowej'],
  [/\bRoasted\b/gi, 'Pieczony'],
  [/\bRoast\b/gi, 'Pieczeń'],
  [/\bGrilled\b/gi, 'Grillowany'],
  [/\bBaked\b/gi, 'Pieczony'],
  [/\bFried\b/gi, 'Smażony'],
  [/\bDeep fried\b/gi, 'Smażony na głębokim oleju'],
  [/\bPan-fried\b/gi, 'Smażony na patelni'],
  [/\bBraised\b/gi, 'Duszony'],
  [/\bSteamed\b/gi, 'Na parze'],
  [/\bSmoky\b/gi, 'Wędzony'],
  [/\bSmoked\b/gi, 'Wędzony'],
  [/\bCrispy\b/gi, 'Chrupiący'],
  [/\bCreamy\b/gi, 'Kremowy'],
  [/\bSpicy\b/gi, 'Pikantny'],
  [/\bSweet and sour\b/gi, 'Słodko-kwaśny'],
  [/\bSweet & sour\b/gi, 'Słodko-kwaśny'],
  [/\bStuffed\b/gi, 'Faszerowany'],
  [/\bSlow cooker\b/gi, 'Z wolnowaru'],
  [/\bSlow-cooked\b/gi, 'Wolno gotowany'],
  [/\bGlazed\b/gi, 'Glazurowany'],
  [/\bMarinated\b/gi, 'Marynowany'],
  [/\bSoup\b/gi, 'Zupa'],
  [/\bStew\b/gi, 'Gulasz'],
  [/\bCasserole\b/gi, 'Zapiekanka'],
  [/\bSalad\b/gi, 'Sałatka'],
  [/\bCurry\b/gi, 'Curry'],
  [/\bPasta\b/gi, 'Makaron'],
  [/\bNoodles\b/gi, 'Makaron noodle'],
  [/\bStir-Fry\b/gi, 'Stir-fry'],
  [/\bStir fry\b/gi, 'Stir-fry'],
  [/\bBurgers\b/gi, 'Burgery'],
  [/\bBurger\b/gi, 'Burger'],
  [/\bSandwiches\b/gi, 'Kanapki'],
  [/\bSandwich\b/gi, 'Kanapka'],
  [/\bMeatballs\b/gi, 'Klopsiki'],
  [/\bMeatball\b/gi, 'Klopsik'],
  [/\bSkewers\b/gi, 'Szaszłyki'],
  [/\bSkewer\b/gi, 'Szaszłyk'],
  [/\bKebabs\b/gi, 'Szaszłyki'],
  [/\bKebab\b/gi, 'Kebab'],
  [/\bDumplings\b/gi, 'Kluski / Pierożki'],
  [/\bDumpling\b/gi, 'Pierożek'],
  [/\bPie\b/gi, 'Zapiekanka / Tarta'],
  [/\bPies\b/gi, 'Tarty'],
  [/\bTartlets\b/gi, 'Tartaletki'],
  [/\bTart\b/gi, 'Tarta'],
  [/\bCake\b/gi, 'Ciasto'],
  [/\bCakes\b/gi, 'Ciasteczka'],
  [/\bPudding\b/gi, 'Pudding'],
  [/\bCookies\b/gi, 'Ciasteczka'],
  [/\bMuffins\b/gi, 'Muffinki'],
  [/\bPancakes\b/gi, 'Pancakes / Naleśniki'],
  [/\bPancake\b/gi, 'Naleśnik'],
  [/\bBread\b/gi, 'Chleb'],
  [/\bRolls\b/gi, 'Bułeczki'],
  [/\bWings\b/gi, 'Skrzydełka'],
  [/\bRibs\b/gi, 'Żeberka'],
  [/\bChops\b/gi, 'Kotlety'],
  [/\bChop\b/gi, 'Kotlet'],
  [/\bSteaks\b/gi, 'Steki'],
  [/\bSteak\b/gi, 'Stek'],
  [/\bRisotto\b/gi, 'Risotto'],
  [/\bFrittata\b/gi, 'Frittata'],
  [/\bOmelette\b/gi, 'Omlet'],
  [/\bOmelet\b/gi, 'Omlet'],
  [/\bFritters\b/gi, 'Placuszki'],
  [/\bBisque\b/gi, 'Krem bisque'],
  [/\bBroth\b/gi, 'Bulion'],
  [/\bChicken\b/gi, 'Kurczak'],
  [/\bBeef\b/gi, 'Wołowina'],
  [/\bPork\b/gi, 'Wieprzowina'],
  [/\bLamb\b/gi, 'Jagnięcina'],
  [/\bTurkey\b/gi, 'Indyk'],
  [/\bDuck\b/gi, 'Kaczka'],
  [/\bSalmon\b/gi, 'Łosoś'],
  [/\bTuna\b/gi, 'Tuńczyk'],
  [/\bCod\b/gi, 'Dorsz'],
  [/\bFish\b/gi, 'Ryba'],
  [/\bSeafood\b/gi, 'Owoce morza'],
  [/\bPrawns\b/gi, 'Krewetki'],
  [/\bPrawn\b/gi, 'Krewetki'],
  [/\bShrimp\b/gi, 'Krewetki'],
  [/\bClams\b/gi, 'Małże'],
  [/\bMussels\b/gi, 'Mule'],
  [/\bSquid\b/gi, 'Kalmary'],
  [/\bBacon\b/gi, 'Boczek'],
  [/\bHam\b/gi, 'Szynka'],
  [/\bSausages\b/gi, 'Kiełbaski'],
  [/\bSausage\b/gi, 'Kiełbasa'],
  [/\bMushrooms\b/gi, 'Pieczarki / Grzyby'],
  [/\bMushroom\b/gi, 'Grzyby'],
  [/\bSweet potatoes\b/gi, 'Bataty'],
  [/\bSweet potato\b/gi, 'Bataty'],
  [/\bPotatoes\b/gi, 'Ziemniaki'],
  [/\bPotato\b/gi, 'Ziemniaki'],
  [/\bTomatoes\b/gi, 'Pomidory'],
  [/\bTomato\b/gi, 'Pomidory'],
  [/\bSpinach\b/gi, 'Szpinak'],
  [/\bBroccoli\b/gi, 'Brokuły'],
  [/\bCauliflower\b/gi, 'Kalafior'],
  [/\bCabbage\b/gi, 'Kapusta'],
  [/\bEggplant\b/gi, 'Bakłażan'],
  [/\bAubergine\b/gi, 'Bakłażan'],
  [/\bZucchini\b/gi, 'Cukinia'],
  [/\bCourgette\b/gi, 'Cukinia'],
  [/\bBeans\b/gi, 'Fasola'],
  [/\bBean\b/gi, 'Fasola'],
  [/\bLentils\b/gi, 'Soczewica'],
  [/\bChickpeas\b/gi, 'Ciecierzyca'],
  [/\bPeas\b/gi, 'Groszek'],
  [/\bCorn\b/gi, 'Kukurydza'],
  [/\bCheese\b/gi, 'Ser'],
  [/\bGarlic\b/gi, 'Czosnek'],
  [/\bOnions\b/gi, 'Cebula'],
  [/\bOnion\b/gi, 'Cebula'],
  [/\bGinger\b/gi, 'Imbir'],
  [/\bChilli\b/gi, 'Chilli'],
  [/\bChili\b/gi, 'Chilli'],
  [/\bLemon\b/gi, 'Cytryna'],
  [/\bLime\b/gi, 'Limonka'],
  [/\bApples\b/gi, 'Jabłka'],
  [/\bApple\b/gi, 'Jabłko'],
  [/\bBananas\b/gi, 'Banany'],
  [/\bBanana\b/gi, 'Banan'],
  [/\bBerries\b/gi, 'Owoce leśne'],
  [/\bBerry\b/gi, 'Owoce leśne'],
  [/\bStrawberries\b/gi, 'Truskawki'],
  [/\bStrawberry\b/gi, 'Truskawki'],
  [/\bChocolate\b/gi, 'Czekolada'],
  [/\bVanilla\b/gi, 'Wanilia'],
  [/\bCoconut\b/gi, 'Kokos'],
  [/\bButter\b/gi, 'Masło'],
  [/\bHoney\b/gi, 'Miód'],
  [/\bMustard\b/gi, 'Musztarda'],
  [/\bRice\b/gi, 'Ryż'],
  [/\bEggs\b/gi, 'Jajka'],
  [/\bEgg\b/gi, 'Jajko'],
  [/\bAvocado\b/gi, 'Awokado'],
  [/\bWalnuts\b/gi, 'Orzechy włoskie'],
  [/\bWalnut\b/gi, 'Orzechy włoskie'],
  [/\bAlmonds\b/gi, 'Migdały'],
  [/\bAlmond\b/gi, 'Migdały'],
  [/\bFennel\b/gi, 'Fenkuł'],
  [/\bwith\b/gi, 'z'],
  [/\band\b/gi, 'i'],
  [/\b&\b/g, 'i'],
  [/\bin\b/gi, 'w'],
  [/\bstyle\b/gi, 'w stylu']
]

function generalTranslate(text: string): string {
  let res = text
  for (const [r, repl] of PROCEDURAL_REPLACEMENTS) {
    res = res.replace(r, repl)
  }
  return res.replace(/\s{2,}/g, ' ').trim()
}

function resolveInstrumental(word: string): string {
  const w = word.trim().toLowerCase()
  return INSTRUMENTAL_INGREDIENTS[w] || generalTranslate(word)
}

/**
 * Tłumaczy angielski tytuł potrawy/przepisu na naturalny język polski.
 */
export function formatMealTitlePl(rawTitle?: string): string {
  if (!rawTitle) return ''
  const trimmed = rawTitle.trim()
  if (!trimmed) return ''

  // 1. Sprawdzenie słownika dokładnych dopasowań
  if (EXACT_MEAL_TITLES_PL[trimmed]) {
    return EXACT_MEAL_TITLES_PL[trimmed]
  }

  // Wyszukiwanie case-insensitive
  const lower = trimmed.toLowerCase()
  for (const [key, val] of Object.entries(EXACT_MEAL_TITLES_PL)) {
    if (key.toLowerCase() === lower) {
      return val
    }
  }

  // 2. Syntaktyczna inwersja szyku wyrazów dla popularnych wzorców kuchennych:
  let s = trimmed.replace(/\bRecipe\b/gi, '').replace(/\bHome-made\b/gi, 'Domowe').replace(/\bHomemade\b/gi, 'Domowe').trim()

  // [X] and [Y] Pie -> Zapiekanka z [X] i [Y]
  const andPieMatch = s.match(/^(.+?)\s+(?:and|&)\s+(.+?)\s+Pie$/i)
  if (andPieMatch) {
    return `Zapiekanka z ${resolveInstrumental(andPieMatch[1])} i ${resolveInstrumental(andPieMatch[2])}`
  }

  // [X] Wings -> Skrzydełka z [X]
  const wingsMatch = s.match(/^(.+?)\s+Wings$/i)
  if (wingsMatch) {
    const ing = wingsMatch[1].toLowerCase()
    return `Skrzydełka ${ing.includes('chicken') ? 'z kurczaka' : `z ${resolveInstrumental(wingsMatch[1])}`}`
  }

  // [X] Soup -> Zupa [X]
  const soupMatch = s.match(/^(.+?)\s+Soup$/i)
  if (soupMatch) {
    const type = SOUP_TYPES[soupMatch[1].toLowerCase()]
    return `Zupa ${type || resolveInstrumental(soupMatch[1])}`
  }

  // [X] Salad -> Sałatka [X]
  const saladMatch = s.match(/^(.+?)\s+Salad$/i)
  if (saladMatch) {
    const type = SALAD_TYPES[saladMatch[1].toLowerCase()]
    return `Sałatka ${type || resolveInstrumental(saladMatch[1])}`
  }

  // [X] Cake -> Ciasto [X]
  const cakeMatch = s.match(/^(.+?)\s+Cake$/i)
  if (cakeMatch) {
    const type = CAKE_TYPES[cakeMatch[1].toLowerCase()]
    return `Ciasto ${type || resolveInstrumental(cakeMatch[1])}`
  }

  // [X] Curry -> Curry z [X]
  const curryMatch = s.match(/^(.+?)\s+Curry$/i)
  if (curryMatch) {
    return `Curry z ${resolveInstrumental(curryMatch[1])}`
  }

  // [X] Stew -> Gulasz z [X]
  const stewMatch = s.match(/^(.+?)\s+Stew$/i)
  if (stewMatch) {
    return `Gulasz z ${resolveInstrumental(stewMatch[1])}`
  }

  // [X] Tart -> Tarta z [X]
  const tartMatch = s.match(/^(.+?)\s+Tart$/i)
  if (tartMatch) {
    return `Tarta z ${resolveInstrumental(tartMatch[1])}`
  }

  // [X] Meatballs -> Pulpety [X]
  const meatballsMatch = s.match(/^(.+?)\s+Meatballs$/i)
  if (meatballsMatch) {
    const type = MEATBALL_TYPES[meatballsMatch[1].toLowerCase()]
    return `Pulpety ${type || resolveInstrumental(meatballsMatch[1])}`
  }

  // [X] Skewers -> Szaszłyki z [X]
  const skewersMatch = s.match(/^(.+?)\s+Skewers$/i)
  if (skewersMatch) {
    return `Szaszłyki z ${resolveInstrumental(skewersMatch[1])}`
  }

  // [X] Rice -> Ryż z [X]
  const riceMatch = s.match(/^(.+?)\s+Rice$/i)
  if (riceMatch) {
    return `Ryż z ${resolveInstrumental(riceMatch[1])}`
  }

  // [X] Pasta / Noodles -> Makaron z [X]
  const pastaMatch = s.match(/^(.+?)\s+(?:Pasta|Noodles)$/i)
  if (pastaMatch) {
    return `Makaron z ${resolveInstrumental(pastaMatch[1])}`
  }

  // 3. Ogólne dopasowanie proceduralne
  return generalTranslate(s)
}

export const translateRecipeTitle = formatMealTitlePl
