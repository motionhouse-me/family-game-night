// Game Night — content for Same Brain, The Imposter and Word Bomb.
// Add as many as you like: one per line. Duplicates are removed automatically.

const lines = (s) => [...new Set(s.split("\n").map((x) => x.trim()).filter(Boolean))];

// ---------------------------------------------------------------------------
// SAME BRAIN — prompts with an "obvious" answer but plenty of room to split.
// ---------------------------------------------------------------------------
export const SAME_BRAIN = lines(`
A fruit that's yellow
A fruit that's red
A fruit that's green
A fruit with seeds you can see
A tropical fruit
A fruit you peel
A berry
Something you find in a fridge
Something you find in a freezer
Something in your junk drawer
Something you take to the beach
Something you take on a plane
Something you pack for a sleepover
A famous footballer
A famous basketball player
A famous tennis player
A football club
An animal at the zoo
An animal that's dangerous
An animal that's cute
An animal that's slow
An animal that's fast
An animal with stripes
An animal with a long neck
An animal that lives in the desert
An animal in the ocean
An animal you'd ride
A farm animal
A pet
A bird
An insect
A sea creature
A dinosaur
A baby animal name
A colour
A pizza topping
Something in a school bag
Something in a pencil case
A breakfast food
An Egyptian city
A city in the UAE
A dish your mum makes
A dish your grandma makes
Something every Arab household has
A drink at a café
A hot drink
A cold drink
A fizzy drink
A juice flavour
A smoothie ingredient
A country in Europe
A country in Africa
A country in Asia
A country in South America
A country you want to visit
A country with a red flag
An island
A capital city
A city everyone wants to visit
A superhero
A villain
A word you say when you're surprised
A word you say when you're annoyed
Something you do on a Friday
Something you do on a Sunday
A sport
A sport with a ball
A water sport
An Olympic sport
A winter sport
A sweet or dessert
A Middle Eastern dessert
A cake flavour
A cookie or biscuit
A chocolate bar
A candy or sweet
An ice cream flavour
Something you'd find in a hospital
Something you'd find in a pharmacy
An app on your phone
A social media app
A game on your phone
A vegetable
A green vegetable
A vegetable you hate
A thing that's cold
A thing that's hot
A thing that's sharp
A thing that's soft
A thing that's sticky
A thing that's loud
A thing that's tiny
A thing that's huge
A thing that's heavy
A thing that's round
A thing that's square
A thing that's shiny
A thing that smells good
A thing that smells bad
Something you lose all the time
A reason to be late
A good excuse for skipping homework
A job
A job that pays a lot
A dream job
A job you'd hate
A job that needs a uniform
Something in a bathroom
Something in a kitchen
Something in a bedroom
Something in the living room
Something in a garage
Something in a garden
A month of the year
A day of the week
A number between 1 and 10
A number between 1 and 100
A planet
A shape
A musical instrument
A body part
A body part above the neck
Something with wheels
Something that flies
Something in the sky
Something you see at night
A famous singer
A famous band
A famous rapper
A famous actor
A famous actress
A famous Arab singer
A Disney movie
A Pixar movie
A Disney princess
A cartoon character
A cartoon from your childhood
A board game
A card game
A game you play at a party
A playground game
A thing you plug in
A kind of weather
A natural disaster
Something you wear on your head
Something you wear on your feet
Something you wear in winter
Something you wear in summer
Something you wear to a wedding
An accessory
A piece of jewellery
A smell you love
A smell you hate
A thing you do every morning
A thing you do before bed
Something at a wedding
Something at a birthday party
Something at Eid
Something you eat at iftar
Something you eat at suhoor
A Ramadan tradition
A gift you'd get your mum
A gift you'd get your dad
A gift for a baby
A gift nobody wants
Something that's always in grandma's house
A snack for a road trip
A snack at the cinema
A crunchy snack
A salty snack
A healthy snack
A shop in the mall
A fast food place
A coffee chain
A restaurant you'd go to for a birthday
A school subject
A school subject everyone hates
Something a teacher says
Something you hear at school
A thing on a desk
Something you do in the summer
Something you do in the winter
Something you do on holiday
Something you do at the beach
Something you do at the park
A kind of tree
A flower
A thing that's green
A thing that's red
A thing that's blue
A thing that's white
A thing that's black
A thing that's pink
A thing that's orange
A thing that's purple
A thing that's brown
A thing that's gold
Something yellow that isn't a fruit
Something with stripes
Something with spots
Something with a lid
Something with a handle
Something with a tail
Something with wings
Something with legs that isn't alive
Something you're scared of
A word that rhymes with "cat"
A word that rhymes with "night"
A word that rhymes with "fun"
A word that rhymes with "cake"
A word that rhymes with "bee"
A name starting with M
A name starting with A
A name starting with S
A name starting with Y
A boy's name
A girl's name
A name everyone in the family has
Something you say on the phone
A thing you shout at the TV
Something you see at the airport
A car brand
A luxury car
A phone brand
A clothing brand
A sports brand
A makeup product
A skincare product
A hairstyle
A famous landmark
A wonder of the world
A thing in a toolbox
Something in a first-aid kit
Something people collect
A hobby
A hobby you can do alone
A spice
A herb
A cheese
A type of bread
A type of pasta
A type of rice dish
A nut
Something you put on toast
Something you put on fries
A sauce
A dip
A sandwich filling
A soup
A salad ingredient
Something you dip in hummus
A koshari ingredient
Something you add to tea
Something you add to coffee
A type of tea
A thing that has buttons
Something with a screen
Something you charge
A thing that needs batteries
Something you do when you're bored
Something you do when you can't sleep
Something you do when you're nervous
Something you do when it rains
A thing in your wallet
A thing in your handbag
Something you'd take camping
A thing you need for a picnic
A word for "very good"
A word for "very bad"
A word for "money"
Something that's always too expensive
Something that's free
A thing you share with your siblings
Something siblings fight about
A chore nobody wants to do
A movie everyone has seen
A scary movie
A movie that makes people cry
A video game
A video game character
A famous person from Egypt
A famous Egyptian actor
A famous Egyptian footballer
A Middle Eastern dish
An Egyptian street food
A Lebanese dish
A Gulf dish
Something you'd see in the desert
Something at the pyramids
Something on a pharaoh
An ancient Egyptian god
Something you'd see on the Nile
Something you'd see in Dubai
Something you buy at the supermarket every week
Something you'd forget on holiday
Something in a hotel room
A thing on a plane
A kitchen appliance
A thing you cook with eggs
A way to cook an egg
A way to cook potatoes
A thing you bake
A thing you fry
A thing you grill
A breakfast at a hotel buffet
A word to describe your best friend
A compliment
An insult a sibling would say
A thing you say to a baby
A thing your auntie always asks you
A thing your parents always say
A thing your mum shouts
A thing your dad does every day
Something you'd find under the sofa
A thing you wait in line for
A Netflix show
A show everyone binged
A reality TV show
A YouTuber
A famous influencer
A thing you say before eating
A thing you say after eating
A greeting
A goodbye
A reason to call grandma
A famous painting
A famous artist
A famous scientist
A famous inventor
A famous historical figure
A king or queen
An emoji you use a lot
A text abbreviation
A word with double letters
A three-letter word
A five-letter word
A word that starts with Z
A word that starts with Q
Something you do on your phone in bed
A thing you'd do with a million dirhams
A thing you'd buy if you were rich
A superpower
A magical creature
A fairy tale
A nursery rhyme
A thing in a castle
A thing on a pirate ship
A thing in space
A thing in a classroom
A thing in an office
A thing in a hospital room
A thing at a petrol station
A thing at a supermarket checkout
A thing at the dentist
A thing at a barber
A thing at the gym
A thing at a playground
A thing at a theme park
A theme park ride
A thing at the circus
A thing at a football match
A thing at a concert
A thing at a museum
A thing in a library
A thing at a mosque
A thing on a farm
A thing in a forest
A thing in a jungle
A thing on a mountain
A thing in the sea
A thing on a beach
Something that grows
Something that melts
Something that bounces
Something that floats
Something that sinks
Something that breaks easily
Something that lasts forever
Something you can't live without
Something you'd save in a fire
Something old people love
Something kids love
Something teenagers love
Something you outgrow
A thing you were scared of as a kid
A thing you got in trouble for as a kid
A toy
A toy from the 2000s
A famous toy brand
A thing in a toy box
A thing in a lunchbox
A sticker on a laptop
A thing you draw when you're bored
A thing you can fold
A thing you can roll
A thing you can throw
A thing you can kick
A thing you can climb
A thing you can wear on your wrist
A thing you put in your hair
A thing you put on your face
A hand gesture
A dance move
A famous dance
A famous song
A song everyone knows the words to
A wedding song
A birthday song
A type of music
A thing you hear at night
A thing you hear in the morning
A sound an animal makes
An animal that makes a noise at night
A thing that beeps
A thing that rings
A thing that ticks
A thing that buzzes
A thing that glows
A thing you light
A thing you blow out
A thing you blow up
A thing you turn on
A thing you open every day
A thing you lock
A thing you wash
A thing you fix
A thing you clean
A thing you paint
A thing you water
A thing you feed
A thing you count
A thing you measure
A thing you sign
A thing you return
A thing you borrow and never return
A thing you lend
A thing you forget to charge
A password idea
A popular pet name
A popular dog name
A popular cat name
A dog breed
A cat breed
A horse colour
A fish people eat
A seafood
A meat
A chicken dish
A burger topping
A cereal
A thing in a salad bar
A thing in a buffet
A thing at a barbecue
Something you eat with your hands
Something you eat with a spoon
Something you eat with chopsticks
Something you eat cold
Something you eat hot
A spicy food
A sour food
A sweet food that's also salty
A food that smells strong
A food you hated as a kid
A food you could eat every day
A late-night snack
A comfort food
A street food
A food truck
A dish at a wedding
A thing at a hotel pool
A thing in a hotel lobby
A thing on a road trip
A road sign
A thing at a traffic light
A thing in a car
A thing in a taxi
A thing on a bus
A thing on a train
A thing at a train station
A way to travel
A holiday destination
A beach destination
A ski destination
A thing in a suitcase
A thing at a souvenir shop
A souvenir from Egypt
A souvenir from Dubai
A thing at the souk
A thing at a market
A thing you haggle for
A fabric
A pattern
A colour of eyes
A colour of hair
A face feature
A finger
A body organ
A bone
A thing a doctor checks
A thing that hurts
A way to say sorry
A way to say thank you
A way to say hello in another language
A language
A thing you learn at school
A thing you learn at home
A thing you learn from your grandparents
A family tradition
A thing at a family gathering
A thing cousins do together
A thing aunties do at weddings
A thing uncles say
A thing on the dinner table
A thing on a coffee table
A thing on a fridge door
A thing on a wall
A thing on a shelf
A thing on a bed
A thing under the bed
A thing in a closet
A thing in a drawer
A thing behind the TV
A thing in a car's glovebox
`);

// ---------------------------------------------------------------------------
// THE IMPOSTER — [word, imposter word]: close enough to blend in.
// ---------------------------------------------------------------------------
export const IMPOSTER = lines(`
Beach|Pool
Pizza|Burger
Cat|Dog
Coffee|Tea
Football|Basketball
Plane|Helicopter
Doctor|Nurse
Wedding|Birthday party
Apple|Pear
Pen|Pencil
Sun|Moon
Train|Bus
Lion|Tiger
Piano|Guitar
Rain|Snow
Hotel|Hospital
Bed|Sofa
Shark|Dolphin
Chocolate|Ice cream
Mall|Supermarket
Phone|Tablet
Pyramid|Sphinx
Desert|Beach
Teacher|Principal
Fork|Spoon
Shoes|Socks
Car|Motorbike
Cinema|Theatre
Breakfast|Dinner
Mango|Pineapple
Rice|Pasta
Ramadan|Eid
Falafel|Shawarma
Koshari|Molokhia
Hummus|Baba ghanoush
Camel|Horse
Nile|Red Sea
Cairo|Alexandria
Dubai|Abu Dhabi
Instagram|TikTok
WhatsApp|Snapchat
Netflix|YouTube
Gym|Park
Swimming|Surfing
Library|Bookshop
Watch|Bracelet
Glasses|Sunglasses
Hat|Cap
Jacket|Hoodie
Dress|Skirt
Lipstick|Nail polish
Perfume|Deodorant
Shampoo|Soap
Toothbrush|Hairbrush
Fridge|Freezer
Oven|Microwave
Kettle|Toaster
Candle|Lamp
Window|Door
Stairs|Elevator
Clock|Calendar
Map|Compass
Bridge|Tunnel
Volcano|Mountain
River|Lake
Island|Boat
Rose|Tulip
Bee|Butterfly
Spider|Ant
Owl|Eagle
Penguin|Polar bear
Monkey|Gorilla
Zoo|Farm
Circus|Fair
Ghost|Zombie
Superman|Batman
Princess|Queen
Pirate|Ninja
Robot|Alien
Astronaut|Pilot
Chef|Waiter
Police|Firefighter
Dentist|Barber
Exam|Homework
Holiday|Weekend
Morning|Night
Summer|Spring
Birthday cake|Cupcake
Popcorn|Chips
Juice|Smoothie
Water|Milk
Salt|Sugar
Ketchup|Mayonnaise
Sandwich|Wrap
Soup|Stew
Egg|Chicken
Fish|Shrimp
Steak|Kofta
Baklava|Kunafa
Dates|Figs
Watermelon|Melon
Lemon|Orange
Tomato|Strawberry
Carrot|Potato
Grandma|Auntie
Brother|Cousin
Baby|Toddler
Sleepover|Road trip
Picnic|Barbecue
Camping|Hiking
Rollercoaster|Waterslide
Bicycle|Scooter
Taxi|Uber
Airport|Train station
Passport|Ticket
Suitcase|Backpack
Pillow|Blanket
Towel|Bathrobe
Mirror|Window
Comb|Brush
Scissors|Knife
Hammer|Screwdriver
Ladder|Stairs
Umbrella|Raincoat
Gloves|Mittens
Scarf|Tie
Ring|Necklace
Earrings|Bracelet
Wallet|Purse
Key|Lock
Laptop|Computer
Keyboard|Mouse
Headphones|Speaker
TV|Projector
Camera|Phone
Remote|Controller
PlayStation|Xbox
Minecraft|Roblox
FIFA|Fortnite
Mario|Sonic
Lego|Puzzle
Chess|Checkers
Cards|Dice
Uno|Monopoly
Hide and seek|Tag
Swing|Slide
Trampoline|Bouncy castle
Balloon|Kite
Fireworks|Sparklers
Christmas tree|Ramadan lantern
Lantern|Candle
Mosque|Church
Prayer mat|Carpet
Quran|Book
Fasting|Diet
Iftar|Suhoor
Dates|Raisins
Eidiya|Pocket money
New clothes|Shoes
Henna|Tattoo
Bride|Groom
Ring|Crown
Wedding dress|Abaya
Zaffa|Party
DJ|Singer
Drum|Tambourine
Oud|Guitar
Violin|Cello
Trumpet|Saxophone
Microphone|Speaker
Concert|Festival
Ballet|Gymnastics
Karate|Boxing
Tennis|Badminton
Golf|Mini golf
Bowling|Billiards
Skiing|Snowboarding
Ice skating|Rollerblading
Diving|Snorkelling
Fishing|Sailing
Horse riding|Camel riding
Safari|Zoo
Desert safari|Dune bashing
Sandstorm|Tornado
Earthquake|Volcano
Thunder|Lightning
Rainbow|Sunset
Cloud|Fog
Star|Planet
Rocket|Satellite
Moon|Mars
Sun|Fire
Ocean|Sea
Waterfall|Fountain
Forest|Jungle
Cave|Tunnel
Castle|Palace
Tower|Skyscraper
Burj Khalifa|Eiffel Tower
Pyramids|Petra
London|Paris
New York|Los Angeles
Japan|China
Italy|Spain
Turkey|Greece
Morocco|Tunisia
Lebanon|Jordan
Saudi Arabia|Kuwait
Sharm El Sheikh|Hurghada
Luxor|Aswan
Sahel|Ain Sokhna
Gouna|Marina
Tuk tuk|Taxi
Metro|Tram
Ferry|Cruise ship
Submarine|Yacht
Ambulance|Fire truck
Police car|Taxi
Tractor|Truck
Petrol station|Car wash
Parking|Garage
Traffic|Roadworks
Speed bump|Roundabout
Seatbelt|Helmet
Driving test|Exam
Graduation|Prom
University|School
Classroom|Office
Boss|Teacher
Meeting|Lesson
Email|Text message
Voice note|Phone call
FaceTime|Zoom
Selfie|Group photo
Filter|Makeup
Haircut|Shave
Nail salon|Barber
Spa|Massage
Sauna|Jacuzzi
Pool party|Beach party
Sunscreen|Lotion
Sunglasses|Hat
Flip flops|Sandals
Sneakers|Boots
Pyjamas|Tracksuit
Uniform|Suit
Hoodie|Sweater
Jeans|Leggings
Shorts|Swimsuit
Backpack|Handbag
Lunchbox|Water bottle
Pencil case|Ruler
Notebook|Diary
Calculator|Phone
Highlighter|Marker
Stapler|Tape
Glue|Tape
Crayons|Paint
Sketch|Painting
Museum|Art gallery
Statue|Mummy
Mummy|Zombie
Pharaoh|King
Cleopatra|Nefertiti
Tutankhamun|Ramses
Hieroglyphs|Emoji
Sphinx|Lion
Scarab|Beetle
Crocodile|Alligator
Snake|Lizard
Frog|Toad
Turtle|Tortoise
Rabbit|Hamster
Parrot|Pigeon
Chicken|Duck
Cow|Buffalo
Sheep|Goat
Donkey|Horse
Elephant|Rhino
Giraffe|Zebra
Kangaroo|Koala
Panda|Bear
Wolf|Fox
Bat|Owl
Jellyfish|Octopus
Whale|Shark
Crab|Lobster
Seashell|Pearl
Sand|Dust
Rock|Stone
Gold|Silver
Diamond|Crystal
Money|Gift card
Bank|ATM
Shop|Market
Souk|Mall
Bargain|Sale
Online shopping|Delivery
Talabat|Uber Eats
McDonald's|KFC
Starbucks|Costa
Pizza Hut|Domino's
Shawarma|Doner
Fries|Wedges
Nuggets|Wings
Milkshake|Smoothie
Pancakes|Waffles
Croissant|Muffin
Donut|Cookie
Cheesecake|Tiramisu
Om Ali|Rice pudding
Basbousa|Kunafa
Feteer|Pizza
Ful|Lentils
Taameya|Falafel
Mahshi|Dolma
Fattah|Biryani
Mandi|Kabsa
Molokhia|Spinach
Tahini|Hummus
Pickles|Olives
Cucumber|Zucchini
Onion|Garlic
Pepper|Chilli
Lettuce|Cabbage
Corn|Peas
Mushroom|Truffle
Bread|Toast
Cheese|Butter
Yoghurt|Labneh
Honey|Jam
Nutella|Peanut butter
Cereal|Oats
Coffee|Hot chocolate
Karak|Latte
Mint tea|Green tea
Lemonade|Iced tea
Pepsi|Coca-Cola
Water|Sparkling water
`).map((l) => l.split("|").map((s) => s.trim())).filter((p) => p.length === 2 && p[0] && p[1] && p[0] !== p[1]);

// ---------------------------------------------------------------------------
// WORD BOMB — letter chunks. Easy ones show up first; harder ones mix in later.
// ---------------------------------------------------------------------------
export const BOMB_EASY = [
  "TH", "IN", "ER", "AN", "RE", "ON", "AT", "EN", "ST", "OR", "AR", "AL", "LE",
  "ING", "ENT", "ION", "CH", "SH", "TR", "OU", "EA", "LY", "UN", "TER", "OP",
  "OT", "AB", "ATE", "AP", "AD", "OO", "EE", "INE", "EST", "PR", "IT", "ED",
  "IC", "OL", "AC", "ES", "IS", "TE", "RA", "NE", "SE", "TI", "RO", "LA", "MA",
];
export const BOMB_HARD = [
  "BLE", "ALL", "VER", "ANT", "IP", "CON", "BR", "GR", "CR", "PL", "SP", "ACK",
  "OW", "ELL", "ILL", "AND", "OUT", "MAN", "ONE", "IGHT", "AY", "EW", "END",
  "ORE", "ARD", "IDE", "ART", "AIN", "EAR", "OCK", "ICK", "AME", "AKE", "ICE",
  "ASH", "UMP", "ONG", "OOK", "QU", "WH", "FR", "SK", "FUL", "OY", "ULL", "OUND",
  "AIR", "OAT", "UST", "ISH", "NESS", "MENT", "PH", "GL", "CL", "FL", "DR", "SC",
];
