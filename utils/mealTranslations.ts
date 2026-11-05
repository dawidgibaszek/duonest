export const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8'
}

/**
 * Zwraca poprawną polską formę gramatyczną rzeczownika w zależności od liczby:
 * forms: [
 *   0: lp mianownik (np. 1 łyżka, 1 szklanka, 1 ząbek),
 *   1: lm mianownik (np. 2, 3, 4 łyżki, szklanki, ząbki),
 *   2: lm dopełniacz (np. 5, 6, 20 łyżek, szklanek, ząbków),
 *   3: lp dopełniacz (np. 1/2 łyżki, 1/2 szklanki, 1/2 ząbka)
 * ]
 */
export function getPolishDeclension(
  numStr: string,
  forms: [string, string, string, string]
): string {
  const clean = numStr.trim()
  if (clean.includes('/') || clean.includes('.') || clean.includes(',')) {
    return forms[3] || forms[1]
  }
  const n = parseInt(clean, 10)
  if (isNaN(n)) return forms[0]

  const abs = Math.abs(n)
  if (abs === 1) return forms[0]

  const rem10 = abs % 10
  const rem100 = abs % 100

  if (rem10 >= 2 && rem10 <= 4 && (rem100 < 10 || rem100 >= 20)) {
    return forms[1]
  }
  return forms[2]
}

/**
 * Tłumaczy angielskie miary kulinarne na język polski z zachowaniem poprawnej gramatyki
 */
export function translateMeasurePl(rawMeasure?: string): string {
  if (!rawMeasure) return ''
  let m = rawMeasure.trim()
  if (!m) return ''

  // 1. Zamiana ułamków unikodowych na cyfry
  for (const [frac, repl] of Object.entries(UNICODE_FRACTIONS)) {
    m = m.replace(new RegExp(frac, 'g'), repl)
  }

  // 1b. Zlepione ułamki typu "1 1/2" -> "1 i 1/2"
  m = m.replace(/(\d+)\s+(\d+\/\d+)/g, '$1 i $2')

  // 2. Angielskie liczebniki słowne na cyfry
  m = m.replace(/\bone\b/gi, '1')
  m = m.replace(/\btwo\b/gi, '2')
  m = m.replace(/\bthree\b/gi, '3')
  m = m.replace(/\bfour\b/gi, '4')

  // 3. Wyrażenia specjalne (juice of, zest of itp.)
  m = m.replace(/\bjuice\s+and\s+zest\s+of\s+(\d+(?:\s*(?:i|\/|-)\s*\d+)?)\b/gi, (_, n) => `sok i skórka starta z ${n} sztuk`)
  m = m.replace(/\bjuice\s+of\s+(\d+(?:\s*(?:i|\/|-)\s*\d+)?)\b/gi, (_, n) => {
    const num = parseInt(n, 10)
    return `sok z ${n} ${num === 1 ? 'sztuki' : 'sztuk'}`
  })
  m = m.replace(/\bzest\s+of\s+(\d+(?:\s*(?:i|\/|-)\s*\d+)?)\b/gi, (_, n) => {
    const num = parseInt(n, 10)
    return `skórka starta z ${n} ${num === 1 ? 'sztuki' : 'sztuk'}`
  })

  // 4. Jednostki z liczbami (obsługa odmiany gramatycznej)
  const NUMBER_PATTERN = '(\\d+(?:\\s*i\\s*\\d+\\/\\d+|\\/\\d+|[.,]\\d+)?(?:-\\d+)?)'

  // Łyżki stołowe (tbsp, tbs, tbl, tablespoon)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*(?:tbsps?|tbs\\.?|tblsp?s?\\.?|tablespoons?)\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['łyżka', 'łyżki', 'łyżek', 'łyżki'])}`
  )

  // Łyżeczki (tsp, teaspoon)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*(?:tsps?\\.?|teaspoons?)\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['łyżeczka', 'łyżeczki', 'łyżeczek', 'łyżeczki'])}`
  )

  // Łyżki deserowe (dsp, dessertspoon)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*(?:dsps?\\.?|dessertspoons?)\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['łyżka deserowa', 'łyżki deserowe', 'łyżek deserowych', 'łyżki deserowej'])}`
  )

  // Szklanki (cup, cups, glass, glasses)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*(?:cups?|glasses)\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['szklanka', 'szklanki', 'szklanek', 'szklanki'])}`
  )

  // Ząbki czosnku (clove, cloves)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*cloves?\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['ząbek', 'ząbki', 'ząbków', 'ząbka'])}`
  )

  // Główki (head, heads)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*heads?\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['główka', 'główki', 'główek', 'główki'])}`
  )

  // Plastry (slice, slices)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*slices?\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['plaster', 'plastry', 'plastrów', 'plastra'])}`
  )

  // Puszki (can, cans, tin, tins)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*(?:cans?|tins?)\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['puszka', 'puszki', 'puszek', 'puszki'])}`
  )

  // Szczypty (pinch, pinches)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*pinches?\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['szczypta', 'szczypty', 'szczypt', 'szczypty'])}`
  )

  // Pęczki (bunch, bunches)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*bunches?\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['pęczek', 'pęczki', 'pęczków', 'pęczka'])}`
  )

  // Gałązki (sprig, sprigs)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*sprigs?\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['gałązka', 'gałązki', 'gałązek', 'gałązki'])}`
  )

  // Łodygi (stalk, stalks, rib, ribs)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*(?:stalks?|ribs?)\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['łodyga', 'łodygi', 'łodyg', 'łodygi'])}`
  )

  // Liście (leaf, leaves)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*(?:leaves|leafs?)\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['liść', 'liście', 'liści', 'liścia'])}`
  )

  // Garście (handful, handfuls)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*handfuls?\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['garść', 'garście', 'garści', 'garści'])}`
  )

  // Opakowania (pack, packs, package, packages, packet, packets, pkt)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*(?:packs?|packages?|packets?|pkts?\\.?)\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['opakowanie', 'opakowania', 'opakowań', 'opakowania'])}`
  )

  // Słoiki (jar, jars)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*jars?\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['słoik', 'słoiki', 'słoików', 'słoika'])}`
  )

  // Butelki (bottle, bottles)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*bottles?\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['butelka', 'butelki', 'butelek', 'butelki'])}`
  )

  // Sztuki (piece, pieces, pcs)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*(?:pieces?|pcs?\\.?)\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['sztuka', 'sztuki', 'sztuk', 'sztuki'])}`
  )

  // Kostki (cube, cubes)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*cubes?\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['kostka', 'kostki', 'kostek', 'kostki'])}`
  )

  // Płaty (sheet, sheets)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*sheets?\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['płat', 'płaty', 'płatów', 'płata'])}`
  )

  // Filety (fillet, fillets)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*fillets?\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['filet', 'filety', 'filetów', 'fileta'])}`
  )

  // Krople (drop, drops)
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*drops?\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['kropla', 'krople', 'kropel', 'kropli'])}`
  )

  // Rozmiary z liczbą: large, medium, small
  // np. "1 large", "2 large", "1 medium", "1 small"
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*large\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['duża szt.', 'duże szt.', 'dużych szt.', 'dużej szt.'])}`
  )
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*medium\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['średnia szt.', 'średnie szt.', 'średnich szt.', 'średniej szt.'])}`
  )
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*small\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['mała szt.', 'małe szt.', 'małych szt.', 'małej szt.'])}`
  )

  // Waga i objętość
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*(?:lbs?\\.?|pounds?)\\b`, 'gi'),
    (_, n) => `${n} ${getPolishDeclension(n, ['funt (ok. 450g)', 'funty (ok. 900g)', 'funtów', 'funta'])}`
  )
  m = m.replace(
    new RegExp(`\\b${NUMBER_PATTERN}\\s*(?:oz\\.?|ounces?)\\b`, 'gi'),
    (_, n) => `${n} oz`
  )

  // 5. Samotne jednostki (bez liczb lub z przedrostkiem 'a/an')
  const standaloneUnits: [RegExp, string][] = [
    [/\ba\s+pinch\b/gi, 'szczypta'],
    [/\ba\s+dash\b/gi, 'odrobina'],
    [/\ba\s+splash\b/gi, 'odrobina'],
    [/\ba\s+handful\b/gi, 'garść'],
    [/\ba\s+few\s+drops\b/gi, 'kilka kropel'],
    [/\ba\s+drop\b/gi, 'kropla'],
    [/\ba\s+bunch\b/gi, 'pęczek'],
    [/\btbsps?\.?\b/gi, 'łyżki'],
    [/\btbs\.?\b/gi, 'łyżki'],
    [/\btablespoons?\b/gi, 'łyżki'],
    [/\btsps?\.?\b/gi, 'łyżeczki'],
    [/\bteaspoons?\b/gi, 'łyżeczki'],
    [/\bcups?\b/gi, 'szklanki'],
    [/\bcloves?\b/gi, 'ząbki'],
    [/\bslices?\b/gi, 'plastry'],
    [/\bpinch of\b/gi, 'szczypta'],
    [/\bpinch\b/gi, 'szczypta'],
    [/\bpinches\b/gi, 'szczypty'],
    [/\bcans?\b/gi, 'puszka'],
    [/\btins?\b/gi, 'puszka'],
    [/\bhandful of\b/gi, 'garść'],
    [/\bhandful\b/gi, 'garść'],
    [/\bbunch of\b/gi, 'pęczek'],
    [/\bbunch\b/gi, 'pęczek'],
    [/\bsprigs?\b/gi, 'gałązki'],
    [/\blarge\b/gi, 'duża szt.'],
    [/\bmedium\b/gi, 'średnia szt.'],
    [/\bsmall\b/gi, 'mała szt.']
  ]

  for (const [regex, repl] of standaloneUnits) {
    m = m.replace(regex, repl)
  }

  // 6. Określenia kulinarne i deskryptory
  const descriptors: [RegExp, string][] = [
    [/\bpeeled\s*(?:and|,)?\s*crushed\b/gi, 'obrane i zmiażdżone'],
    [/\bpeeled\s*(?:and|,)?\s*chopped\b/gi, 'obrane i posiekane'],
    [/\bfinely\s+diced\b/gi, 'drobno pokrojone w kostkę'],
    [/\bfinely\s+chopped\b/gi, 'drobno posiekane'],
    [/\bcoarsely\s+chopped\b/gi, 'grubo posiekane'],
    [/\bthinly\s+sliced\b/gi, 'cienko pokrojone w plastry'],
    [/\bthickly\s+sliced\b/gi, 'grubo pokrojone w plastry'],
    [/\bcut\s+into\s+cubes\b/gi, 'pokrojone w kostkę'],
    [/\bchopped\b/gi, 'posiekane'],
    [/\bdiced\b/gi, 'pokrojone w kostkę'],
    [/\bsliced\b/gi, 'pokrojone w plastry'],
    [/\bminced\b/gi, 'drobno posiekane'],
    [/\bgrated\b/gi, 'starte'],
    [/\bcrushed\b/gi, 'zmiażdżone'],
    [/\bpeeled\b/gi, 'obrane'],
    [/\bmelted\b/gi, 'roztopione'],
    [/\bsoftened\b/gi, 'zmiękczone'],
    [/\bshredded\b/gi, 'starte / poszarpane'],
    [/\bbeaten\b/gi, 'roztrzepane'],
    [/\bdrained\s*(?:and|,)?\s*rinsed\b/gi, 'odsączone i opłukane'],
    [/\bdrained\b/gi, 'odsączone'],
    [/\brinsed\b/gi, 'opłukane'],
    [/\bpitted\b/gi, 'bez pestek'],
    [/\bseeded\b/gi, 'bez nasion'],
    [/\bto taste\b/gi, 'do smaku'],
    [/\bfor frying\b/gi, 'do smażenia'],
    [/\bfor cooking\b/gi, 'do gotowania'],
    [/\bfor serving\b/gi, 'do podania'],
    [/\bfor garnish\b/gi, 'do dekoracji'],
    [/\bfor drizzling\b/gi, 'do skropienia'],
    [/\bas needed\b/gi, 'według uznania'],
    [/\bas required\b/gi, 'według uznania'],
    [/\boptional\b/gi, 'opcjonalnie'],
    [/\b(?:about|approx\.?)\b/gi, 'ok.']
  ]

  for (const [regex, repl] of descriptors) {
    m = m.replace(regex, repl)
  }

  return m.replace(/\s{2,}/g, ' ').trim()
}

export const formatMeasurePl = translateMeasurePl

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
  'chicken stock cube': 'Kostka bulionu drobiowego',
  'chicken stock cubes': 'Kostki bulionu drobiowego',
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
  'beef stock cube': 'Kostka bulionu wołowego',
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
  'fish stock': 'Bulion rybny',
  'fish broth': 'Bulion rybny',
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
  'fennel': 'Fenkuł (koper włoski)',
  'fennel bulb': 'Bulwa fenkułu',
  'fresh fennel': 'Świeży fenkuł',
  'baby fennel': 'Młody fenkuł',
  'vegetable stock': 'Bulion warzywny',
  'vegetable broth': 'Bulion warzywny',
  'vegetable stock cube': 'Kostka bulionu warzywnego',
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
  'brandy': 'Brandy',
  'cognac': 'Koniak',
  'rum': 'Rum',
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
  'fennel seed': 'Nasiona kopru włoskiego',
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
  'chia seeds': 'Nasiona chia',
  'cafe la llave': 'Kawa mielona espresso',
  'callaloo': 'Liście szarłatu (callaloo)',
  'canned beans': 'Fasola w puszce',
  'caramel': 'Karmel',
  'casabe': 'Chlebek z manioku (casabe)',
  'cassaba': 'Maniok',
  'cassava': 'Maniok',
  'celeriac': 'Seler korzeniowy',
  'cheese': 'Ser żółty',
  'cherry': 'Wiśnie',
  'chestnuts': 'Kasztany jadalne',
  'chimichurri sauce': 'Sos chimichurri',
  'chinese leaf': 'Kapusta pekińska',
  'chinese long beans': 'Fasolnik chiński',
  'chinese sesame sauce': 'Sos sezamowy',
  'chinese five spice powder': 'Przyprawa pięciu smaków',
  'chopped chive': 'Posiekany szczypiorek',
  'christmas pudding': 'Świąteczny pudding',
  'chuck roast': 'Łopatka wołowa do pieczenia',
  'ciabatta': 'Ciabatta',
  'colby jack cheese': 'Ser Colby Jack',
  'conchs': 'Skrzydelniki (ślimaki morskie)',
  'cooked chestnut': 'Ugotowane kasztany jadalne',
  'cooking wine': 'Wino do gotowania',
  'cranberry': 'Żurawina',
  'currants': 'Porzeczki / rodzynki',
  'deli ham': 'Szynka delikatesowa',
  'digestive biscuits': 'Herbatniki digestive',
  'doubanjiang': 'Pikantna pasta z bobu (doubanjiang)',
  'dried cherries': 'Suszone wiśnie',
  'dried fruit': 'Bakalie / suszone owoce',
  'dried leaves of summer savoury': 'Cząber suszony',
  'dried white navy beans': 'Biała drobna fasola',
  'dried white beans': 'Biała fasola suszona',
  'dry sherry': 'Wytrawne sherry',
  'dulce de leche': 'Masa kajmakowa (dulce de leche)',
  'dutch stroop': 'Holenderski syrop stroop',
  'egg roll wrappers': 'Ciasto na sajgonki',
  'egg rolls': 'Sajgonki',
  'elderflower cordial': 'Syrop z kwiatów czarnego bzu',
  'fenugreek': 'Kozieradka',
  'fermented black beans': 'Fermentowana czarna soja',
  'fish paste': 'Pasta rybna',
  'flaxseed': 'Siemię lniane',
  'galangal': 'Galangal (dziki imbir)',
  'garlic salt': 'Sól czosnkowa',
  'gelatin': 'Żelatyna',
  'goji berries': 'Jagody goji',
  'granola': 'Granola / płatki chrupiące',
  'grapefruit': 'Grejpfrut',
  'grapes': 'Winogrona',
  'gravy': 'Sos pieczeniowy',
  'green cabbage': 'Młoda biała kapusta',
  'green cardamom': 'Zielony kardamon',
  'green peas': 'Groszek zielony',
  'ground black pepper': 'Mielony czarny pieprz',
  'ground mace': 'Mielony kwiat muszkatołowy',
  'ground white pepper': 'Biały pieprz mielony',
  'guacamole': 'Guacamole',
  'hake': 'Morszczuk',
  'herring': 'Śledź',
  'hickory sauce': 'Sos dymny hickory BBQ',
  'horseradish': 'Chrzan',
  'hot dog buns': 'Bułki do hot-dogów',
  'hummus': 'Hummus',
  'jerk seasoning': 'Jamajska przyprawa jerk',
  'kimchi': 'Kimchi',
  'kiwi': 'Kiwi',
  'kohlrabi': 'Kalarepa',
  'kumquat': 'Kumkwat',
  'lager': 'Jasne piwo lager',
  'lard': 'Smalec',
  'liver': 'Wątróbka',
  'lobster': 'Homar',
  'mackerel': 'Makrela',
  'mango': 'Mango',
  'marjoram': 'Majeranek',
  'marshmallows': 'Pianki marshmallow',
  'melon': 'Melon',
  'miso': 'Pasta miso',
  'mixed vegetables': 'Mieszanka warzywna',
  'monkfish': 'Żabnica (nawęd)',
  'mustard powder': 'Gorczyca mielona w proszku',
  'nori': 'Wodorosty nori',
  'nutella': 'Krem czekoladowy Nutella',
  'octopus': 'Ośmiornica',
  'okra': 'Okra',
  'onion powder': 'Cebula w proszku',
  'oxtail': 'Ogon wołowy',
  'pastry': 'Ciasto kruche / francuskie',
  'peach': 'Brzoskwinia',
  'pears': 'Gruszki',
  'pecorino': 'Ser pecorino',
  'pecan': 'Orzechy pekan',
  'pickles': 'Ogórki kiszone / konserwowe',
  'pigeon peas': 'Fasolnik gołębi (pigeon peas)',
  'pineapple': 'Ananas',
  'pinto beans': 'Fasola pinto',
  'pistachios': 'Pistacje',
  'plantain': 'Banany warzywne (plantany)',
  'plum': 'Śliwki',
  'pomegranate': 'Granat',
  'provolone': 'Ser provolone',
  'prunes': 'Suszone śliwki',
  'rice flour': 'Mąka ryżowa',
  'rice paper': 'Papier ryżowy',
  'robiola': 'Ser robiola',
  'rye flour': 'Mąka żytnia',
  'sake': 'Japońskie wino ryżowe sake',
  'sauerkraut': 'Kapusta kiszona',
  'semolina': 'Kasza manna (semolina)',
  'sherry': 'Sherry',
  'shortening': 'Tłuszcz cukierniczy',
  'soba noodles': 'Makaron gryczany soba',
  'soda water': 'Woda gazowana sodowa',
  'sourdough': 'Chleb na zakwasie',
  'suet': 'Łój wołowy cukierniczy',
  'tabasco sauce': 'Sos tabasco',
  'tamarind': 'Tamarandowiec (pasta z tamaryndowca)',
  'tarragon leaves': 'Liście estragonu',
  'tea': 'Herbata',
  'thyme leaves': 'Listki tymianku',
  'tortilla chips': 'Nachosy / chipsy kukurydziane',
  'trout': 'Pstrąg',
  'truffle oil': 'Oliwa truflowa',
  'udon noodles': 'Makaron udon',
  'veal': 'Cielęcina',
  'vermicelli': 'Cienki makaron vermicelli',
  'vinaigrette': 'Sos winegret',
  'vodka': 'Wódka',
  'wonton wrappers': 'Ciasto na pierożki wonton',
  'achiote paste': 'Pasta achiote',
  'achiote seeds': 'Nasiona achiote (annato)',
  'ackee': 'Owoc ackee',
  'alinos sauce': 'Sos Alinos',
  'all-purpose seasoning': 'Przyprawa uniwersalna',
  'almond essence': 'Aromat migdałowy',
  'almond extract': 'Ekstrakt z migdałów',
  'almond paste': 'Masa migdałowa (marcepan)',
  'anchovy fillet': 'Filety z anchois',
  'apples': 'Jabłka',
  'apricot': 'Morele',
  'apricot jam': 'Dżem morelowy',
  'baby pak koi': 'Młoda kapusta pak choi',
  'baguette': 'Bagietka',
  'bamboo shoot': 'Pędy bambusa',
  'banana': 'Banany',
  'banana leaves': 'Liście bananowca',
  'barbeque sauce': 'Sos BBQ',
  'bean sprouts': 'Kiełki fasoli mung',
  'biryani masala': 'Przyprawa biryani masala',
  'black pudding': 'Kaszanka',
  'black treacle': 'Czarne treacle (melasa)',
  'blackberries': 'Jeżyny',
  'blackcurrant jam': 'Dżem z czarnej porzeczki',
  'blueberries': 'Borówki amerykańskie',
  'bok choi': 'Kapusta bok choy (pak choi)',
  'borlotti beans': 'Fasola borlotti',
  'bouillon cubes': 'Kostki rosołowe',
  'bouquet garni': 'Bukiet ziół (bouquet garni)',
  'braeburn apples': 'Jabłka Braeburn',
  'bramley apples': 'Jabłka Bramley (kwaśne)',
  'broad beans': 'Bób',
  'brussels sprouts': 'Brukselka',
  'bryndza cheese': 'Bryndza',
  'buckwheat': 'Kasza gryczana',
  'bulgur wheat': 'Kasza bulgur',
  'bun': 'Bułka',
  'buns': 'Bułki do burgerów',
  'cacao': 'Kakao',
  'candied peel': 'Kandyzowana skórka cytrusowa',
  'cantuccini': 'Włoskie ciasteczka cantuccini',
  'caramel sauce': 'Sos karmelowy',
  'caraway seed': 'Kminek',
  'castor sugar': 'Drobny cukier do wypieków',
  'celery salt': 'Sól selerowa',
  'challah': 'Chałka',
  'challots': 'Szalotki',
  'charlotte potatoes': 'Ziemniaki sałatkowe Charlotte',
  'cheese curds': 'Skrzep serowy (curds)',
  'cherry jam': 'Dżem wiśniowy',
  'chestnut mushroom': 'Pieczarki brunatne',
  'chopped onion': 'Posiekana cebula',
  'cider': 'Cydr jabłkowy',
  'clotted cream': 'Gęsta śmietana clotted cream',
  'coconut': 'Kokos (wiórki)',
  'condensed milk': 'Mleko skondensowane słodzone',
  'coriander leaves': 'Liście kolendry',
  'cranberries': 'Żurawina',
  'creme fraiche': 'Śmietana crème fraîche',
  'crispy bacon': 'Chrupiący boczek',
  'crushed red pepper': 'Płatki chili',
  'custard': 'Krem budyniowy (custard)',
  'dark rum': 'Ciemny rum',
  'desiccated coconut': 'Wiórki kokosowe',
  'doner meat': 'Mięso doner kebab',
  'dried apricots': 'Suszone morele',
  'dried basil': 'Suszona bazylia',
  'dried cranberries': 'Suszona żurawina',
  'dried sorrel': 'Suszony szczaw',
  'duck fat': 'Tłuszcz kaczy',
  'egg plants': 'Bakłażany',
  'enoki mushrooms': 'Grzyby enoki',
  'fajita seasoning': 'Przyprawa do fajitas',
  'figs': 'Figi świeże',
  'french fries': 'Frytki',
  'fries': 'Frytki',
  'fromage frais': 'Serek homogenizowany fromage frais',
  'frozen mixed berries': 'Mrożone owoce leśne',
  'ginger garlic paste': 'Pasta imbirowo-czosnkowa',
  'gloucester cheese': 'Ser Gloucester',
  'golden syrup': 'Syrop złocisty (golden syrup)',
  'gouda cheese': 'Ser Gouda',
  'grape nut cereal': 'Płatki zbożowe Grape Nuts',
  'ground clove': 'Mielone goździki',
  'ground ginger': 'Imbir mielony',
  'ground mahleb': 'Mielony mahleb',
  'ground poppy seeds': 'Mielony mak',
  'gruyere cheese': 'Ser Gruyère',
  'haloumi': 'Ser halloumi',
  'hard taco shells': 'Twarde muszle taco',
  'harissa spice': 'Pasta/przyprawa harissa',
  'hoisin sauce': 'Sos hoisin',
  'hot chilli powder': 'Ostre chili w proszku',
  'hot pepper sauce': 'Ostry sos paprykowy',
  'ice cream': 'Lody waniliowe',
  'jalapeno peppers': 'Papryczki jalapeño',
  'lamb mince': 'Mielona jagnięcina',
  'lemongrass': 'Trawa cytrynowa',
  'minced ginger': 'Drobno starty imbir',
  'mirin': 'Japońskie wino mirin',
  'molasses': 'Melasa trzcinowa',
  'monterey jack cheese': 'Ser Monterey Jack',
  'morning glory': 'Szpinak wodny (morning glory)',
  'mozzarella balls': 'Kuleczki mozzarelli',
  'mustard seeds': 'Ziarna gorczycy',
  'oatmeal': 'Płatki owsiane',
  'pak choi': 'Kapusta pak choi',
  'passion fruit': 'Marakuja',
  'passion fruit pulp': 'Pulpa z marakui',
  'pecan nuts': 'Orzechy pekan',
  'pesto': 'Zielone pesto bazyliowe',
  'polenta': 'Kaszka kukurydziana polenta',
  'prahok': 'Kambodżańska pasta rybna prahok',
  'puff pastry': 'Ciasto francuskie',
  'raisins': 'Rodzynki',
  'raspberries': 'Maliny',
  'raspberry jam': 'Dżem malinowy',
  'rhubarb': 'Rabarbar',
  'rye grain': 'Ziarno żyta',
  'saffron': 'Szafran',
  'sardines': 'Sardynki',
  'saskatoon berries': 'Owoce świdośliwy (saskatoon)',
  'sesame seed': 'Ziarna sezamu',
  'sesame seed burger buns': 'Bułki do burgerów z sezamem',
  'shredded meat': 'Szarpane mięso',
  'smoked haddock': 'Wędzony łupacz',
  'starch': 'Skrobia spożywcza',
  'strawberries': 'Truskawki',
  'strawberry jam': 'Dżem truskawkowy',
  'tahini': 'Pasta tahini (sezamowa)',
  'tahini paste': 'Pasta tahini (sezamowa)',
  'tarragon': 'Estragon',
  'thai green curry paste': 'Zielona pasta curry',
  'thai red curry paste': 'Czerwona pasta curry',
  'tofu': 'Tofu naturalne',
}

// Posortowane klucze od najdłuższych do najkrótszych, by "fish stock" dopasowywało się przed "fish"
const SORTED_INGREDIENT_PAIRS = Object.entries(INGREDIENTS_PL_DICT).sort(
  (a, b) => b[0].length - a[0].length
)

export function translateIngredientName(name?: string): string {
  if (!name) return ''
  const trimmed = name.trim()
  const lower = trimmed.toLowerCase()

  // 1. Dokładne dopasowanie
  if (INGREDIENTS_PL_DICT[lower]) {
    return INGREDIENTS_PL_DICT[lower]
  }

  // 2. Fallback liczby pojedynczej/mnogiej
  if (lower.endsWith('s') && INGREDIENTS_PL_DICT[lower.slice(0, -1)]) {
    return INGREDIENTS_PL_DICT[lower.slice(0, -1)]
  }

  // 3. Dopasowanie podciągu (od najdłuższego hasła do najkrótszego)
  for (const [enKey, plVal] of SORTED_INGREDIENT_PAIRS) {
    if (lower.includes(enKey) && enKey.length > 3) {
      return plVal
    }
  }

  return trimmed
}
