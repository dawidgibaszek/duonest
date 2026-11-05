export interface MealIngredient {
  name: string
  measure: string
}

export interface MealRecipe {
  id: string
  title: string
  titlePl?: string
  category: string
  categoryPl: string
  area: string
  areaPl: string
  instructions: string
  instructionsSteps?: string[]
  thumbnail: string
  tags: string[]
  youtubeUrl: string | null
  sourceUrl: string | null
  ingredients: MealIngredient[]
}

export const MEAL_CATEGORY_TRANSLATIONS: Record<string, string> = {
  Beef: 'Wołowina',
  Chicken: 'Drób & Kurczak',
  Dessert: 'Desery',
  Lamb: 'Jagnięcina',
  Miscellaneous: 'Różne',
  Pasta: 'Makarony',
  Pork: 'Wieprzowina',
  Seafood: 'Owoce morza & Ryby',
  Side: 'Dodatki',
  Starter: 'Przekąski',
  Vegan: 'Wegańskie',
  Vegetarian: 'Wegetariańskie',
  Breakfast: 'Śniadania',
  Goat: 'Koźlina'
}

export const MEAL_AREA_TRANSLATIONS: Record<string, string> = {
  Italian: 'Włoska',
  Mexican: 'Meksykańska',
  American: 'Amerykańska',
  Chinese: 'Chińska',
  Japanese: 'Japońska',
  Indian: 'Indyjska',
  French: 'Francuska',
  Greek: 'Grecka',
  Spanish: 'Hiszpańska',
  Thai: 'Tajska',
  Polish: 'Polska',
  British: 'Brytyjska',
  Turkish: 'Turecka',
  Vietnamese: 'Wietnamska',
  Moroccan: 'Marokańska',
  Portuguese: 'Portugalska',
  Dutch: 'Holenderska',
  Croatian: 'Chorwacka',
  Egyptian: 'Egipska',
  Filipino: 'Filipińska',
  Irish: 'Irlandzka',
  Jamaican: 'Jamajska',
  Malaysian: 'Malezyjska',
  Russian: 'Rosyjska',
  Canadian: 'Kanadyjska',
  Tunisian: 'Tunezja',
  Unknown: 'Międzynarodowa'
}

export const POLISH_TO_ENGLISH_SEARCH: Record<string, string> = {
  makaron: 'pasta',
  makarony: 'pasta',
  spaghetti: 'spaghetti',
  kurczak: 'chicken',
  drob: 'chicken',
  drób: 'chicken',
  kurczaka: 'chicken',
  wolowina: 'beef',
  wołowina: 'beef',
  wieprzowina: 'pork',
  ryba: 'fish',
  ryby: 'fish',
  losos: 'salmon',
  łosoś: 'salmon',
  tunczyk: 'tuna',
  tuńczyk: 'tuna',
  krewetki: 'prawn',
  owoce_morza: 'seafood',
  pizza: 'pizza',
  zupa: 'soup',
  salatka: 'salad',
  sałatka: 'salad',
  nalesniki: 'pancake',
  naleśniki: 'pancake',
  burger: 'burger',
  burgery: 'burger',
  ser: 'cheese',
  ziemniaki: 'potato',
  ryz: 'rice',
  ryż: 'rice',
  ciasto: 'cake',
  czekolada: 'chocolate',
  jajka: 'egg',
  jajko: 'egg',
  pomidory: 'tomato'
}

// ------------------------------------------------------------------
// CULINARY INGREDIENTS DICTIONARY (EN -> PL)
// ------------------------------------------------------------------
export const INGREDIENTS_PL_DICT: Record<string, string> = {
  // Mięsa i drób
  'chicken': 'Kurczak',
  'chicken breast': 'Pierś z kurczaka',
  'chicken breasts': 'Piersi z kurczaka',
  'boneless chicken breast': 'Pierś z kurczaka bez kości',
  'boneless skinless chicken breasts': 'Filety z piersi kurczaka',
  'chicken thigh': 'Udko z kurczaka',
  'chicken thighs': 'Udka z kurczaka',
  'boneless chicken thighs': 'Udka z kurczaka bez kości',
  'chicken leg': 'Nóżka z kurczaka',
  'chicken legs': 'Nóżki z kurczaka',
  'chicken drumstick': 'Pałka z kurczaka',
  'chicken drumsticks': 'Podudzia z kurczaka',
  'chicken wings': 'Skrzydełka z kurczaka',
  'minced chicken': 'Mielone mięso z kurczaka',
  'ground chicken': 'Mielone mięso z kurczaka',
  'chicken stock': 'Bulion drobiowy',
  'chicken broth': 'Bulion drobiowy',
  'beef': 'Wołowina',
  'minced beef': 'Mięso mielone wołowe',
  'ground beef': 'Mięso mielone wołowe',
  'beef mince': 'Mięso mielone wołowe',
  'lean minced beef': 'Chude mięso mielone wołowe',
  'beef steak': 'Stek wołowy',
  'beef sirloin': 'Polędwica wołowa',
  'beef chuck': 'Karkówka wołowa',
  'beef brisket': 'Mostek wołowy',
  'beef stock': 'Bulion wołowy',
  'beef broth': 'Bulion wołowy',
  'pork': 'Wieprzowina',
  'pork chops': 'Kotlety schabowe',
  'pork chop': 'Kotlet schabowy',
  'pork loin': 'Schab wieprzowy',
  'pork belly': 'Boczek świeży',
  'minced pork': 'Mięso mielone wieprzowe',
  'ground pork': 'Mięso mielone wieprzowe',
  'pork mince': 'Mięso mielone wieprzowe',
  'pork shoulder': 'Łopatka wieprzowa',
  'bacon': 'Boczek',
  'smoked bacon': 'Boczek wędzony',
  'streaky bacon': 'Boczek w plastrach',
  'pancetta': 'Boczek pancetta',
  'ham': 'Szynka',
  'parma ham': 'Szynka parmeńska',
  'prosciutto': 'Szynka prosciutto',
  'sausage': 'Kiełbasa',
  'sausages': 'Kiełbaski',
  'chorizo': 'Kiełbasa chorizo',
  'pepperoni': 'Salami pepperoni',
  'lamb': 'Jagnięcina',
  'lamb chops': 'Kotlety jagnięce',
  'minced lamb': 'Mielona jagnięcina',
  'ground lamb': 'Mielona jagnięcina',
  'turkey': 'Indyk',
  'turkey breast': 'Pierś z indyka',
  'minced turkey': 'Mielone mięso z indyka',
  'ground turkey': 'Mielone mięso z indyka',
  'duck': 'Kaczka',
  'duck breast': 'Pierś z kaczki',

  // Ryby i owoce morza
  'salmon': 'Łosoś',
  'salmon fillet': 'Filet z łososia',
  'salmon fillets': 'Filety z łososia',
  'smoked salmon': 'Łosoś wędzony',
  'tuna': 'Tuńczyk',
  'canned tuna': 'Tuńczyk w puszce',
  'tuna steak': 'Stek z tuńczyka',
  'cod': 'Dorsz',
  'cod fillet': 'Filet z dorsza',
  'cod fillets': 'Filety z dorsza',
  'haddock': 'Łupacz',
  'white fish': 'Biała ryba',
  'white fish fillets': 'Filety z białej ryby',
  'fish': 'Ryba',
  'fish fillet': 'Filet rybny',
  'fish fillets': 'Filety rybne',
  'sea bass': 'Okoń morski (labraks)',
  'prawns': 'Krewetki',
  'king prawns': 'Krewetki królewskie',
  'tiger prawns': 'Krewetki tygrysie',
  'shrimp': 'Krewetki',
  'shrimps': 'Krewetki',
  'mussels': 'Małże (mule)',
  'clams': 'Małże',
  'squid': 'Kalmary',
  'calamari': 'Kalmary',
  'scallops': 'Przegrzebki',
  'crab': 'Mięso kraba',
  'crab meat': 'Mięso kraba',
  'anchovies': 'Sardele (anchovies)',
  'anchovy fillets': 'Fileciki anchovies',
  'fish sauce': 'Sos rybny',

  // Nabiał i jajka
  'egg': 'Jajko',
  'eggs': 'Jajka',
  'large egg': 'Duże jajko',
  'large eggs': 'Duże jajka',
  'egg yolk': 'Żółtko',
  'egg yolks': 'Żółtka jaj',
  'egg white': 'Białko jaja',
  'egg whites': 'Białka jaj',
  'butter': 'Masło',
  'unsalted butter': 'Masło niesolone',
  'salted butter': 'Masło solone',
  'ghee': 'Masło klarowane (ghee)',
  'milk': 'Mleko',
  'whole milk': 'Mleko 3.2%',
  'semi-skimmed milk': 'Mleko 2%',
  'skimmed milk': 'Mleko 0.5%',
  'heavy cream': 'Śmietanka 30% / 36%',
  'double cream': 'Gęsta śmietana 36%',
  'single cream': 'Śmietanka 18%',
  'sour cream': 'Kwaśna śmietana 18%',
  'cream': 'Śmietana',
  'whipping cream': 'Śmietana do ubijania 36%',
  'cream cheese': 'Kremowy serek śmietankowy',
  'cottage cheese': 'Twarożek / serek wiejski',
  'mascarpone': 'Serek mascarpone',
  'ricotta': 'Ser ricotta',
  'parmesan': 'Parmezan',
  'parmesan cheese': 'Parmezan (tarty)',
  'parmigiano-reggiano': 'Parmezan Parmigiano-Reggiano',
  'cheddar': 'Ser cheddar',
  'cheddar cheese': 'Ser cheddar',
  'grated cheddar': 'Tarty cheddar',
  'mozzarella': 'Ser mozzarella',
  'mozzarella cheese': 'Ser mozzarella',
  'fresh mozzarella': 'Świeża mozzarella',
  'feta': 'Ser feta',
  'feta cheese': 'Ser feta',
  'goat cheese': 'Ser kozi',
  'goats cheese': 'Ser kozi',
  'blue cheese': 'Ser z niebieską pleśnią',
  'gorgonzola': 'Ser gorgonzola',
  'gruyere': 'Ser gruyère',
  'gouda': 'Ser gouda',
  'monterey jack': 'Ser monterey jack',
  'swiss cheese': 'Ser szwajcarski',
  'brie': 'Ser brie',
  'camembert': 'Ser camembert',
  'paneer': 'Ser paneer',
  'halloumi': 'Ser halloumi',
  'yogurt': 'Jogurt naturalny',
  'natural yogurt': 'Jogurt naturalny',
  'greek yogurt': 'Jogurt grecki',
  'plain yogurt': 'Jogurt naturalny',

  // Warzywa i grzyby
  'garlic': 'Czosnek',
  'garlic clove': 'Ząbek czosnku',
  'garlic cloves': 'Ząbki czosnku',
  'clove garlic': 'Ząbek czosnku',
  'cloves garlic': 'Ząbki czosnku',
  'minced garlic': 'Posiekany czosnek',
  'crushed garlic': 'Zmiażdżony czosnek',
  'garlic powder': 'Czosnek granulowany',
  'onion': 'Cebula',
  'onions': 'Cebule',
  'red onion': 'Czerwona cebula',
  'red onions': 'Czerwone cebule',
  'yellow onion': 'Żółta cebula',
  'white onion': 'Biała cebula',
  'shallot': 'Szalotka',
  'shallots': 'Szalotki',
  'spring onion': 'Dymka / szczypiorek',
  'spring onions': 'Dymka / szczypiorek',
  'scallion': 'Dymka',
  'scallions': 'Dymka',
  'green onion': 'Szczypiorek',
  'green onions': 'Szczypiorek',
  'chives': 'Szczypiorek',
  'leek': 'Por',
  'leeks': 'Pory',
  'ginger': 'Imbir',
  'fresh ginger': 'Świeży imbir',
  'grated ginger': 'Starty imbir',
  'ginger root': 'Korzeń imbiru',
  'ginger paste': 'Pasta imbirowa',
  'tomato': 'Pomidor',
  'tomatoes': 'Pomidory',
  'cherry tomatoes': 'Pomidorki koktajlowe',
  'plum tomatoes': 'Pomidory śliwkowe / pelati',
  'canned tomatoes': 'Pomidory w puszce',
  'tinned tomatoes': 'Pomidory w puszce',
  'chopped tomatoes': 'Krojone pomidory',
  'diced tomatoes': 'Pomidory krojone w kostkę',
  'crushed tomatoes': 'Rozdrobnione pomidory',
  'sun-dried tomatoes': 'Suszone pomidory',
  'sun dried tomatoes': 'Suszone pomidory',
  'tomato puree': 'Przecier / passata pomidorowa',
  'tomato paste': 'Koncentrat pomidorowy',
  'passata': 'Passata pomidorowa',
  'tomato sauce': 'Sos pomidorowy',
  'potato': 'Ziemniak',
  'potatoes': 'Ziemniaki',
  'new potatoes': 'Młode ziemniaki',
  'sweet potato': 'Batat (słodki ziemniak)',
  'sweet potatoes': 'Bataty',
  'carrot': 'Marchew',
  'carrots': 'Marchewki',
  'baby carrots': 'Marchewki mini',
  'celery': 'Seler naciowy',
  'celery ribs': 'Łodygi selera naciowego',
  'celery stick': 'Łodyga selera',
  'celery sticks': 'Łodygi selera naciowego',
  'cucumber': 'Ogórek',
  'cucumbers': 'Ogórki',
  'bell pepper': 'Papryka',
  'bell peppers': 'Papryki',
  'red pepper': 'Czerwona papryka',
  'red peppers': 'Czerwone papryki',
  'green pepper': 'Zielona papryka',
  'green peppers': 'Zielone papryki',
  'yellow pepper': 'Żółta papryka',
  'orange pepper': 'Pomarańczowa papryka',
  'chili': 'Papryczka chilli',
  'chilli': 'Papryczka chilli',
  'red chili': 'Czerwone chilli',
  'red chilli': 'Czerwone chilli',
  'green chili': 'Zielone chilli',
  'green chilli': 'Zielone chilli',
  'chili pepper': 'Papryczka chilli',
  'chilli pepper': 'Papryczka chilli',
  'jalapeno': 'Papryczka jalapeño',
  'jalapeno pepper': 'Papryczka jalapeño',
  'mushrooms': 'Pieczarki / grzyby',
  'button mushrooms': 'Pieczarki',
  'chestnut mushrooms': 'Pieczarki brunatne',
  'cremini mushrooms': 'Pieczarki brunatne',
  'portobello mushrooms': 'Pieczarki portobello',
  'wild mushrooms': 'Grzyby leśne',
  'shiitake mushrooms': 'Grzyby shiitake',
  'spinach': 'Szpinak',
  'baby spinach': 'Młody szpinak',
  'kale': 'Jarmuż',
  'lettuce': 'Sałata',
  'iceberg lettuce': 'Sałata lodowa',
  'romaine lettuce': 'Sałata rzymska',
  'rocket': 'Rukola',
  'arugula': 'Rukola',
  'cabbage': 'Kapusta',
  'white cabbage': 'Biała kapusta',
  'red cabbage': 'Czerwona kapusta',
  'savoy cabbage': 'Kapusta włoska',
  'broccoli': 'Brokuł',
  'broccoli florets': 'Różyczki brokuła',
  'cauliflower': 'Kalafior',
  'cauliflower florets': 'Różyczki kalafiora',
  'zucchini': 'Cukinia',
  'courgette': 'Cukinia',
  'courgettes': 'Cukinie',
  'aubergine': 'Bakłażan',
  'eggplant': 'Bakłażan',
  'asparagus': 'Szparagi',
  'peas': 'Groszek zielony',
  'frozen peas': 'Mrożony groszek',
  'green beans': 'Fasolka szparagowa',
  'string beans': 'Fasolka szparagowa',
  'corn': 'Kukurydza',
  'sweetcorn': 'Kukurydza',
  'sweet corn': 'Kukurydza',
  'baby corn': 'Kukurydza mini',
  'avocado': 'Awokado',
  'beetroot': 'Burak',
  'beets': 'Buraki',
  'radish': 'Rzodkiewka',
  'radishes': 'Rzodkiewki',
  'artichoke': 'Karczoch',
  'artichokes': 'Karczochy',
  'olives': 'Oliwki',
  'black olives': 'Czarne oliwki',
  'green olives': 'Zielone oliwki',
  'kalamata olives': 'Oliwki kalamata',
  'capers': 'Kapary',

  // Zboża, makarony, strączki
  'pasta': 'Makaron',
  'spaghetti': 'Makaron spaghetti',
  'penne': 'Makaron penne',
  'fusilli': 'Makaron świderki (fusilli)',
  'rigatoni': 'Makaron rigatoni',
  'tagliatelle': 'Makaron tagliatelle',
  'fettuccine': 'Makaron fettuccine',
  'macaroni': 'Makaron kolanka',
  'lasagne': 'Płaty lasagne',
  'lasagna': 'Płaty lasagne',
  'lasagne sheets': 'Płaty makaronu do lasagne',
  'lasagna sheets': 'Płaty makaronu do lasagne',
  'noodles': 'Makaron noodle',
  'egg noodles': 'Makaron jajeczny noodle',
  'rice noodles': 'Makaron ryżowy',
  'ramen noodles': 'Makaron ramen',
  'rice': 'Ryż',
  'basmati rice': 'Ryż basmati',
  'jasmine rice': 'Ryż jaśminowy',
  'arborio rice': 'Ryż arborio do risotto',
  'risotto rice': 'Ryż do risotto',
  'brown rice': 'Ryż brązowy',
  'white rice': 'Biały ryż',
  'long grain rice': 'Ryż długoziarnisty',
  'flour': 'Mąka pszenna',
  'plain flour': 'Mąka pszenna',
  'all-purpose flour': 'Mąka pszenna uniwersalna',
  'all purpose flour': 'Mąka pszenna',
  'self-raising flour': 'Mąka z proszkiem do pieczenia',
  'self raising flour': 'Mąka z proszkiem do pieczenia',
  'bread flour': 'Mąka chlebowa',
  'cornflour': 'Mąka kukurydziana / skrobia',
  'cornstarch': 'Skrobia kukurydziana',
  'corn starch': 'Skrobia kukurydziana',
  'potato starch': 'Mąka ziemniaczana (skrobia)',
  'bread': 'Chleb',
  'white bread': 'Biały chleb',
  'brown bread': 'Ciemny chleb',
  'breadcrumbs': 'Bułka tarta',
  'panko': 'Bułka tarta panko',
  'panko breadcrumbs': 'Bułka tarta panko',
  'tortilla': 'Tortilla',
  'tortillas': 'Placki tortilli',
  'flour tortillas': 'Tortille pszenne',
  'corn tortillas': 'Tortille kukurydziane',
  'pita': 'Chlebek pita',
  'pita bread': 'Chlebek pita',
  'naan': 'Chlebek naan',
  'naan bread': 'Chlebek naan',
  'pizza dough': 'Ciasto na pizzę',
  'oats': 'Płatki owsiane',
  'rolled oats': 'Płatki owsiane',
  'couscous': 'Kuskus',
  'quinoa': 'Komosa ryżowa (quinoa)',
  'chickpeas': 'Ciecierzyca',
  'canned chickpeas': 'Ciecierzyca w puszce',
  'black beans': 'Czarna fasola',
  'canned black beans': 'Czarna fasola w puszce',
  'kidney beans': 'Czerwona fasola',
  'red kidney beans': 'Czerwona fasola',
  'cannellini beans': 'Biała fasola cannellini',
  'baked beans': 'Fasolka w sosie pomidorowym',
  'lentils': 'Soczewica',
  'red lentils': 'Czerwona soczewica',
  'green lentils': 'Zielona soczewica',
  'brown lentils': 'Brązowa soczewica',

  // Płyny, oleje, octy i sosy
  'olive oil': 'Oliwa z oliwek',
  'extra virgin olive oil': 'Oliwa z oliwek extra virgin',
  'vegetable oil': 'Olej roślinny',
  'sunflower oil': 'Olej słonecznikowy',
  'rapeseed oil': 'Olej rzepakowy',
  'canola oil': 'Olej rzepakowy',
  'sesame oil': 'Olej sezamowy',
  'toasted sesame oil': 'Prażony olej sezamowy',
  'coconut oil': 'Olej kokosowy',
  'soy sauce': 'Sos sojowy',
  'dark soy sauce': 'Ciemny sos sojowy',
  'light soy sauce': 'Jasny sos sojowy',
  'tamari': 'Sos tamari',
  'oyster sauce': 'Sos ostrygowy',
  'worcestershire sauce': 'Sos Worcestershire',
  'worcester sauce': 'Sos Worcestershire',
  'hot sauce': 'Pikantny sos chilli',
  'tabasco': 'Sos Tabasco',
  'sriracha': 'Sos Sriracha',
  'bbq sauce': 'Sos barbecue (BBQ)',
  'vinegar': 'Ocet',
  'white vinegar': 'Biały ocet',
  'red wine vinegar': 'Ocet z czerwonego wina',
  'white wine vinegar': 'Ocet z białego wina',
  'balsamic vinegar': 'Ocet balsamiczny',
  'apple cider vinegar': 'Ocet jabłkowy',
  'rice vinegar': 'Ocet ryżowy',
  'rice wine vinegar': 'Ocet ryżowy',
  'mustard': 'Musztarda',
  'dijon mustard': 'Musztarda Dijon',
  'wholegrain mustard': 'Musztarda francuska (ziarnista)',
  'english mustard': 'Ostra musztarda',
  'mayonnaise': 'Majonez',
  'mayo': 'Majonez',
  'ketchup': 'Ketchup',
  'honey': 'Miód',
  'runny honey': 'Płynny miód',
  'maple syrup': 'Syrop klonowy',
  'water': 'Woda',
  'warm water': 'Ciepła woda',
  'cold water': 'Zimna woda',
  'boiling water': 'Wrzątek',
  'white wine': 'Białe wino (wytrawne)',
  'dry white wine': 'Wytrawne białe wino',
  'red wine': 'Czerwone wino',
  'dry red wine': 'Wytrawne czerwone wino',
  'beer': 'Piwo',
  'coconut milk': 'Mleko kokosowe',
  'coconut cream': 'Krem kokosowy',
  'lime juice': 'Sok z limonki',
  'lemon juice': 'Sok z cytryny',
  'orange juice': 'Sok pomarańczowy',
  'lime zest': 'Starta skórka z limonki',
  'lemon zest': 'Starta skórka z cytryny',
  'orange zest': 'Starta skórka z pomarańczy',
  'lemon': 'Cytryna',
  'lemons': 'Cytryny',
  'lime': 'Limonka',
  'limes': 'Limonki',
  'orange': 'Pomarańcza',
  'oranges': 'Pomarańcze',

  // Zioła i przyprawy
  'salt': 'Sól',
  'sea salt': 'Sól morska',
  'fine salt': 'Drobna sól',
  'black pepper': 'Czarny pieprz mielony',
  'freshly ground black pepper': 'Świeżo mielony czarny pieprz',
  'cracked black pepper': 'Grubo mielony czarny pieprz',
  'pepper': 'Pieprz',
  'white pepper': 'Biały pieprz',
  'paprika': 'Słodka papryka',
  'sweet paprika': 'Słodka papryka mielona',
  'smoked paprika': 'Wędzona papryka',
  'hot paprika': 'Ostra papryka',
  'cayenne pepper': 'Pieprz cayenne',
  'cayenne': 'Pieprz cayenne',
  'chili powder': 'Chilli w proszku',
  'chilli powder': 'Chilli w proszku',
  'chili flakes': 'Płatki chilli',
  'chilli flakes': 'Płatki chilli',
  'red pepper flakes': 'Płatki ostrej papryki',
  'cumin': 'Kmin rzymski (kumin)',
  'ground cumin': 'Mielony kmin rzymski',
  'cumin seeds': 'Ziarna kminu rzymskiego',
  'coriander': 'Kolendra',
  'fresh coriander': 'Świeża kolendra',
  'ground coriander': 'Mielona kolendra',
  'coriander seeds': 'Nasiona kolendry',
  'cilantro': 'Świeża kolendra',
  'fresh cilantro': 'Świeża kolendra',
  'parsley': 'Natka pietruszki',
  'fresh parsley': 'Świeża natka pietruszki',
  'flat leaf parsley': 'Pietruszka naciowa',
  'chopped parsley': 'Posiekana natka pietruszki',
  'basil': 'Bazylia',
  'fresh basil': 'Świeża bazylia',
  'basil leaves': 'Liście bazylii',
  'fresh basil leaves': 'Świeże liście bazylii',
  'oregano': 'Oregano',
  'dried oregano': 'Suszone oregano',
  'fresh oregano': 'Świeże oregano',
  'thyme': 'Tymianek',
  'fresh thyme': 'Świeży tymianek',
  'dried thyme': 'Suszony tymianek',
  'thyme sprigs': 'Gałązki tymianku',
  'rosemary': 'Rozmaryn',
  'fresh rosemary': 'Świeży rozmaryn',
  'dried rosemary': 'Suszony rozmaryn',
  'rosemary sprigs': 'Gałązki rozmarynu',
  'mint': 'Mięta',
  'fresh mint': 'Świeża mięta',
  'mint leaves': 'Liście mięty',
  'dill': 'Świeży koper / koperek',
  'fresh dill': 'Świeży koperek',
  'sage': 'Szałwia',
  'fresh sage': 'Świeża szałwia',
  'bay leaf': 'Liść laurowy',
  'bay leaves': 'Liście laurowe',
  'cinnamon': 'Cynamon',
  'ground cinnamon': 'Mielony cynamon',
  'cinnamon stick': 'Laska cynamonu',
  'cinnamon sticks': 'Laski cynamonu',
  'nutmeg': 'Gałka muszkatołowa',
  'ground nutmeg': 'Mielona gałka muszkatołowa',
  'grated nutmeg': 'Starta gałka muszkatołowa',
  'cardamom': 'Kardamon',
  'ground cardamom': 'Mielony kardamon',
  'cardamom pods': 'Strączki kardamonu',
  'cloves': 'Goździki',
  'ground cloves': 'Mielone goździki',
  'turmeric': 'Kurkuma',
  'ground turmeric': 'Mielona kurkuma',
  'curry powder': 'Przyprawa curry',
  'garam masala': 'Przyprawa Garam Masala',
  'allspice': 'Ziele angielskie',
  'ground allspice': 'Mielone ziele angielskie',
  'star anise': 'Anyż gwiazdkowaty',
  'fennel seeds': 'Nasiona kopru włoskiego',
  'italian seasoning': 'Zioła prowansalskie / włoskie',
  'mixed herbs': 'Zioła prowansalskie',
  'vanilla': 'Wanilia',
  'vanilla extract': 'Ekstrakt z wanilii',
  'vanilla essence': 'Aromat waniliowy',
  'vanilla pod': 'Laska wanilii',
  'baking powder': 'Proszek do pieczenia',
  'baking soda': 'Soda oczyszczona',
  'bicarbonate of soda': 'Soda oczyszczona',
  'yeast': 'Drożdże',
  'active dry yeast': 'Drożdże suszone',
  'sugar': 'Cukier',
  'white sugar': 'Biały cukier',
  'granulated sugar': 'Cukier kryształ',
  'caster sugar': 'Drobny cukier',
  'brown sugar': 'Cukier brązowy',
  'light brown sugar': 'Jasny cukier trzcinowy',
  'dark brown sugar': 'Ciemny cukier trzcinowy',
  'icing sugar': 'Cukier puder',
  'powdered sugar': 'Cukier puder',
  'cocoa': 'Kakao',
  'cocoa powder': 'Kakao w proszku',
  'dark chocolate': 'Gorzka czekolada',
  'milk chocolate': 'Mleczna czekolada',
  'white chocolate': 'Biała czekolada',
  'chocolate chips': 'Kropelki czekoladowe',

  // Orzechy i nasiona
  'walnuts': 'Orzechy włoskie',
  'chopped walnuts': 'Posiekane orzechy włoskie',
  'almonds': 'Migdały',
  'flaked almonds': 'Płatki migdałowe',
  'ground almonds': 'Mąka migdałowa / mielone migdały',
  'pecans': 'Orzechy pekan',
  'hazelnuts': 'Orzechy laskowe',
  'cashews': 'Orzechy nerkowca',
  'cashew nuts': 'Orzechy nerkowca',
  'peanuts': 'Orzeszki ziemne',
  'peanut butter': 'Masło orzechowe',
  'pine nuts': 'Orzeszki piniowe',
  'sesame seeds': 'Nasiona sezamu',
  'white sesame seeds': 'Biały sezam',
  'black sesame seeds': 'Czarny sezam',
  'sunflower seeds': 'Ziarna słonecznika',
  'pumpkin seeds': 'Pestki dyni',
  'chia seeds': 'Nasiona chia'
}

export function translateCategoryToPl(cat: string): string {
  if (!cat) return 'Inne'
  return MEAL_CATEGORY_TRANSLATIONS[cat] || cat
}

export function translateAreaToPl(area: string): string {
  if (!area) return 'Międzynarodowa'
  return MEAL_AREA_TRANSLATIONS[area] || area
}

export function translateIngredientName(name: string): string {
  if (!name) return ''
  const trimmed = name.trim()
  const lower = trimmed.toLowerCase()

  if (INGREDIENTS_PL_DICT[lower]) {
    return INGREDIENTS_PL_DICT[lower]
  }

  // Plural/singular fallback
  if (lower.endsWith('s') && INGREDIENTS_PL_DICT[lower.slice(0, -1)]) {
    return INGREDIENTS_PL_DICT[lower.slice(0, -1)]
  }

  // Substring matching for phrases like "chopped onion", "fresh parsley"
  for (const [enKey, plVal] of Object.entries(INGREDIENTS_PL_DICT)) {
    if (lower.includes(enKey) && enKey.length > 3) {
      return plVal
    }
  }

  return trimmed
}

export function translateMeasurePl(rawMeasure: string): string {
  if (!rawMeasure) return ''
  let m = rawMeasure.trim()

  const replacements: [RegExp, string][] = [
    [/\b(\d+)\s*tbsps?\b/gi, '$1 łyżki'],
    [/\b1\s*tbsps?\b/gi, '1 łyżka'],
    [/\b(\d+)\s*tablespoons?\b/gi, '$1 łyżki'],
    [/\b1\s*tablespoon\b/gi, '1 łyżka'],
    [/\btbsps?\b/gi, 'łyżki'],
    [/\btablespoons?\b/gi, 'łyżki'],

    [/\b(\d+)\s*tsps?\b/gi, '$1 łyżeczki'],
    [/\b1\s*tsps?\b/gi, '1 łyżeczka'],
    [/\b(\d+)\s*teaspoons?\b/gi, '$1 łyżeczki'],
    [/\b1\s*teaspoon\b/gi, '1 łyżeczka'],
    [/\btsps?\b/gi, 'łyżeczki'],
    [/\bteaspoons?\b/gi, 'łyżeczki'],

    [/\b(\d+)\s*cups?\b/gi, '$1 szklanki'],
    [/\b1\s*cup\b/gi, '1 szklanka'],
    [/\bcups?\b/gi, 'szklanki'],

    [/\b(\d+)\s*cloves?\b/gi, '$1 ząbki'],
    [/\b1\s*clove\b/gi, '1 ząbek'],
    [/\bcloves?\b/gi, 'ząbki'],

    [/\b(\d+)\s*slices?\b/gi, '$1 plastry'],
    [/\b1\s*slice\b/gi, '1 plaster'],

    [/\b(\d+)\s*pinches?\b/gi, '$1 szczypty'],
    [/\bpinch of\b/gi, 'szczypta'],
    [/\bpinch\b/gi, 'szczypta'],

    [/\b(\d+)\s*cans?\b/gi, '$1 puszki'],
    [/\b1\s*can\b/gi, '1 puszka'],
    [/\b(\d+)\s*tins?\b/gi, '$1 puszki'],
    [/\b1\s*tin\b/gi, '1 puszka'],

    [/\bhandful\b/gi, 'garść'],
    [/\bbunch\b/gi, 'pęczek'],
    [/\bsprigs?\b/gi, 'gałązki'],
    [/\bto taste\b/gi, 'do smaku'],
    [/\bfor frying\b/gi, 'do smażenia'],
    [/\bas needed\b/gi, 'według uznania'],
    [/\bas required\b/gi, 'według uznania'],
    [/\bdash\b/gi, 'odrobina'],
    [/\bfinely chopped\b/gi, 'drobno posiekane'],
    [/\bchopped\b/gi, 'posiekane'],
    [/\bgrated\b/gi, 'starte'],
    [/\bcrushed\b/gi, 'zmiażdżone']
  ]

  for (const [regex, replacement] of replacements) {
    m = m.replace(regex, replacement)
  }

  return m
}

// Memory cache for translated instructions and recipes
const translationCache = new Map<string, string>()

export async function translateTextToPolish(text: string): Promise<string> {
  if (!text || !text.trim()) return ''
  const clean = text.trim()

  if (translationCache.has(clean)) {
    return translationCache.get(clean)!
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean.slice(0, 480))}&langpair=en|pl`
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(4500) })
    if (res.ok) {
      const data = await res.json()
      const translated = data?.responseData?.translatedText
      if (translated && typeof translated === 'string' && !translated.includes('MYMEMORY WARNING')) {
        translationCache.set(clean, translated)
        return translated
      }
    }
  } catch (_) {
    // Network or timeout fallback
  }

  return clean
}

export function splitInstructionsIntoSteps(rawInstructions: string): string[] {
  if (!rawInstructions) return []

  // Clean line endings
  const clean = rawInstructions.replace(/\r\n/g, '\n').trim()

  // First check if there are paragraphs separated by double newlines or single newlines
  const paragraphs = clean.split(/\n+/).map(p => p.trim()).filter(p => p.length > 5)

  if (paragraphs.length >= 2) {
    return paragraphs.map(p => p.replace(/^(step\s*\d+[:.]?|\d+[\.\)]\s*)/i, '').trim())
  }

  // If only 1 long block of text, split by sentence endings
  const sentences = clean
    .split(/(?<=[.!?])\s+(?=[A-Z0-9ĄĆĘŁŃÓŚŹŻ])/)
    .map(s => s.trim())
    .filter(s => s.length > 10)

  if (sentences.length > 1) {
    return sentences.map(s => s.replace(/^(step\s*\d+[:.]?|\d+[\.\)]\s*)/i, '').trim())
  }

  return [clean]
}

export async function translateRecipeInstructionsAsync(rawInstructions: string): Promise<{ instructionsPl: string; stepsPl: string[] }> {
  if (!rawInstructions) {
    return { instructionsPl: '', stepsPl: [] }
  }

  const rawSteps = splitInstructionsIntoSteps(rawInstructions)
  const translatedSteps: string[] = []

  // Translate up to 10 steps in parallel
  const stepPromises = rawSteps.slice(0, 12).map(async (step) => {
    return await translateTextToPolish(step)
  })

  try {
    const results = await Promise.all(stepPromises)
    for (let i = 0; i < results.length; i++) {
      translatedSteps.push(results[i] || rawSteps[i])
    }
  } catch (_) {
    translatedSteps.push(...rawSteps)
  }

  const instructionsPl = translatedSteps.join('\n\n')
  return {
    instructionsPl,
    stepsPl: translatedSteps
  }
}

export function normalizeMealDbItem(raw: any): MealRecipe {
  const ingredients: MealIngredient[] = []

  for (let i = 1; i <= 20; i++) {
    const ing = raw[`strIngredient${i}`]
    const measure = raw[`strMeasure${i}`]

    if (ing && typeof ing === 'string' && ing.trim()) {
      ingredients.push({
        name: translateIngredientName(ing.trim()),
        measure: measure && typeof measure === 'string' ? translateMeasurePl(measure.trim()) : ''
      })
    }
  }

  const rawTags = raw.strTags
  let tags: string[] = []
  if (rawTags && typeof rawTags === 'string') {
    tags = rawTags.split(',').map((t: string) => t.trim()).filter(Boolean)
  }

  const category = raw.strCategory || 'Inne'
  const area = raw.strArea || 'Międzynarodowa'
  const instructions = String(raw.strInstructions || '').replace(/\r\n/g, '\n')

  return {
    id: String(raw.idMeal || ''),
    title: String(raw.strMeal || 'Bez nazwy'),
    category,
    categoryPl: translateCategoryToPl(category),
    area,
    areaPl: translateAreaToPl(area),
    instructions,
    instructionsSteps: splitInstructionsIntoSteps(instructions),
    thumbnail: String(raw.strMealThumb || ''),
    tags,
    youtubeUrl: raw.strYoutube ? String(raw.strYoutube) : null,
    sourceUrl: raw.strSource ? String(raw.strSource) : null,
    ingredients
  }
}

// ------------------------------------------------------------------
// FULL MEALS CATALOG CACHE (793 RECIPES ACROSS ALL CATEGORIES)
// ------------------------------------------------------------------
let cachedAllMealsCatalog: MealRecipe[] | null = null
let catalogLastFetched = 0
const CATALOG_TTL = 1000 * 60 * 60 * 24 // 24 hours

export async function getAllMealsCatalog(): Promise<MealRecipe[]> {
  const now = Date.now()
  if (cachedAllMealsCatalog && cachedAllMealsCatalog.length > 0 && now - catalogLastFetched < CATALOG_TTL) {
    return cachedAllMealsCatalog
  }

  const categories = [
    'Beef', 'Breakfast', 'Chicken', 'Dessert', 'Goat', 'Lamb',
    'Miscellaneous', 'Pasta', 'Pork', 'Seafood', 'Side', 'Starter',
    'Vegan', 'Vegetarian'
  ]

  const areasToTag = [
    'Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'Spanish',
    'Greek', 'British', 'French', 'Vietnamese', 'Malaysian', 'Filipino'
  ]

  try {
    const areaPromises = areasToTag.map(async (a) => {
      try {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(a)}`, {
          signal: AbortSignal.timeout(4500)
        })
        const data = await res.json()
        return {
          area: a,
          ids: new Set<string>((data.meals || []).map((m: any) => String(m.idMeal)))
        }
      } catch (_) {
        return { area: a, ids: new Set<string>() }
      }
    })

    const catPromises = categories.map(async (c) => {
      try {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(c)}`, {
          signal: AbortSignal.timeout(6000)
        })
        const data = await res.json()
        return (data.meals || []).map((m: any) => ({ ...m, category: c }))
      } catch (_) {
        return []
      }
    })

    const [catResults, areaResults] = await Promise.all([
      Promise.all(catPromises),
      Promise.all(areaPromises)
    ])

    const areaLookup = new Map<string, string>()
    for (const ar of areaResults) {
      for (const id of ar.ids) {
        areaLookup.set(id, ar.area)
      }
    }

    const flatMeals = catResults.flat()
    const map = new Map<string, MealRecipe>()

    for (const m of flatMeals) {
      const id = String(m.idMeal || '')
      if (!id || map.has(id)) continue

      const area = areaLookup.get(id) || 'Międzynarodowa'
      const category = m.category || 'Inne'

      map.set(id, {
        id,
        title: String(m.strMeal || 'Bez nazwy'),
        category,
        categoryPl: translateCategoryToPl(category),
        area,
        areaPl: translateAreaToPl(area),
        instructions: '',
        thumbnail: String(m.strMealThumb || ''),
        tags: [],
        youtubeUrl: null,
        sourceUrl: null,
        ingredients: []
      })
    }

    cachedAllMealsCatalog = Array.from(map.values())
    catalogLastFetched = now
    return cachedAllMealsCatalog
  } catch (err) {
    console.warn('Failed to build meals catalog:', err)
    return cachedAllMealsCatalog || []
  }
}

