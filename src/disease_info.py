"""
AgriSmart AI - ICAR Agricultural Disease & Pest Knowledge Base
Provides expert agronomic advisories, remedies, and prevention tips
for Rice (Oryza sativa) and Maize (Zea mays) based on ICAR-IASRI guidelines.
"""

DISEASE_ADVISORY_DB = {
    # -------------------------------------------------------------------------
    # RICE DISEASES & PESTS (ICAR-IASRI Taxonomy)
    # -------------------------------------------------------------------------
    "Rice_Bacterial_Leaf_Blight": {
        "crop": "Rice",
        "disease_name": "Bacterial Leaf Blight",
        "pathogen_type": "Bacterial (Xanthomonas oryzae pv. oryzae)",
        "severity": "High",
        "symptoms": "Water-soaked lesions on leaf margins turning wavy and straw-colored, wilting of seedlings (Kresek).",
        "organic_remedy": "Spray fresh cow dung slurry extract (20g/L) or apply Pseudomonas fluorescens @ 2.5 kg/ha.",
        "chemical_remedy": "Spray Copper Oxychloride (2.5 g/L) mixed with Streptocycline (1 g/10 L of water) at first sign of disease.",
        "prevention": "Avoid excess nitrogen fertilizer; drain excess standing water from the field; use resistant varieties like IR64 or Swarna.",
        "hindi_summary": "Bacterial Leaf Blight in Rice: Leaf margins turn wavy and straw-colored. Spray Copper Oxychloride and Streptocycline; reduce excess nitrogen application."
    },
    "Rice_Brown_Spot": {
        "crop": "Rice",
        "disease_name": "Brown Spot",
        "pathogen_type": "Fungal (Bipolaris oryzae)",
        "severity": "Moderate to High",
        "symptoms": "Small, oval, dark brown lesions with gray centers across leaf blades and grains.",
        "organic_remedy": "Seed treatment with Trichoderma viride @ 5g/kg seed; spray Neem Seed Kernel Extract (NSKE 5%).",
        "chemical_remedy": "Spray Mancozeb 75% WP @ 2 g/L or Propiconazole 25% EC @ 1 ml/L at tillering stage.",
        "prevention": "Ensure balanced soil nutrition (Zinc and Potassium supplementation); avoid nutrient-deficient drought stress.",
        "hindi_summary": "Brown Spot in Rice: Oval dark brown lesions on leaves and grains. Spray Mancozeb or Propiconazole, and ensure balanced Potassium and Zinc nutrition."
    },
    "Rice_False_Smut": {
        "crop": "Rice",
        "disease_name": "False Smut",
        "pathogen_type": "Fungal (Ustilaginoidea virens)",
        "severity": "High",
        "symptoms": "Individual grains transformed into velvety, yellowish-green to black spore balls (smut balls).",
        "organic_remedy": "Remove and burn infected panicles in paper bags to stop spore dissemination.",
        "chemical_remedy": "Spray Propiconazole 25% EC @ 1 ml/L or Copper Hydroxide 77% WP @ 2 g/L at booting stage.",
        "prevention": "Avoid delayed high-nitrogen application during panicle emergence; field sanitation.",
        "hindi_summary": "False Smut in Rice: Individual grains transform into velvety yellow-green smut balls. Spray Propiconazole or Copper Hydroxide at booting stage."
    },
    "Rice_Leaf_Sheath_Blight": {
        "crop": "Rice",
        "disease_name": "Sheath Blight",
        "pathogen_type": "Fungal (Rhizoctonia solani)",
        "severity": "High",
        "symptoms": "Oval or snake-skin lesions on leaf sheaths near the water level, advancing upwards.",
        "organic_remedy": "Soil application of Trichoderma harzianum enriched farmyard manure @ 250 kg/ha.",
        "chemical_remedy": "Spray Hexaconazole 5% EC @ 2 ml/L or Azoxystrobin 18.2% + Difenoconazole 11.4% SC @ 1 ml/L.",
        "prevention": "Optimal crop spacing (20x15 cm) to allow sunlight penetration; avoid dense planting.",
        "hindi_summary": "Sheath Blight in Rice: Oval or snake-skin lesions on leaf sheaths near water level. Spray Hexaconazole on lower plant portions and avoid dense planting."
    },
    "Rice_Leaf_Folder": {
        "crop": "Rice",
        "disease_name": "Rice Leaf Folder",
        "pathogen_type": "Insect Pest (Cnaphalocrocis medinalis)",
        "severity": "Moderate",
        "symptoms": "Leaves folded longitudinally with larvae feeding inside, leaving white transparent papery streaks.",
        "organic_remedy": "Release Trichogramma chilonis egg parasitoids @ 1,00,000/ha; spray Neem oil 3000 ppm @ 3 ml/L.",
        "chemical_remedy": "Spray Cartap Hydrochloride 50% SP @ 2 g/L or Chlorantraniliprole 18.5% SC @ 0.3 ml/L.",
        "prevention": "Run a rope across the crop canopy early in the morning to dislodge caterpillars.",
        "hindi_summary": "Rice Leaf Folder: Larvae fold leaves and feed internally, leaving transparent streaks. Apply Neem oil or Cartap Hydrochloride if infestation persists."
    },
    "Rice_Rice_Skipper": {
        "crop": "Rice",
        "disease_name": "Rice Skipper",
        "pathogen_type": "Insect Pest (Parnara guttata)",
        "severity": "Low to Moderate",
        "symptoms": "Edges of leaves cut and rolled parallel into tubes, visible leaf defoliation.",
        "organic_remedy": "Hand collection of leaf rolls during nursery/early tillering; spray Beauveria bassiana @ 5 g/L.",
        "chemical_remedy": "Spray Quinalphos 25% EC @ 2 ml/L or Chlorpyrifos 20% EC @ 2.5 ml/L if infestation exceeds ETL.",
        "prevention": "Keep bunds weed-free; avoid staggered plantings in adjoining plots.",
        "hindi_summary": "Rice Skipper: Leaf edges are cut and rolled into tubes. Keep field bunds clean and apply recommended insecticide if ETL is exceeded."
    },
    "Rice_White_Stem_Borer": {
        "crop": "Rice",
        "disease_name": "White Stem Borer",
        "pathogen_type": "Insect Pest (Scirpophaga innotata)",
        "severity": "High",
        "symptoms": "Dead heart during vegetative stage; white ears (empty panicles) during flowering stage.",
        "organic_remedy": "Install pheromone traps @ 8 traps/acre for monitoring and mass trapping of male moths.",
        "chemical_remedy": "Apply Fipronil 0.3% GR @ 25 kg/ha or Chlorantraniliprole 0.4% G @ 10 kg/ha in standing water.",
        "prevention": "Clip seedling tips before transplanting to destroy egg masses; deep summer ploughing.",
        "hindi_summary": "White Stem Borer in Rice: Causes dead heart in vegetative stage and white empty ears in flowering stage. Install pheromone traps and apply granular Fipronil."
    },
    "Rice_Yellow_Stem_Borer": {
        "crop": "Rice",
        "disease_name": "Yellow Stem Borer",
        "pathogen_type": "Insect Pest (Scirpophaga incertulas)",
        "severity": "High",
        "symptoms": "Central shoot dries up ('dead heart') in young crop; panicles turn chaffy and white ('white ear').",
        "organic_remedy": "Install yellow stem borer sex pheromone traps @ 10-12/ha; release Trichogramma japonicum.",
        "chemical_remedy": "Broadcast Cartap Hydrochloride 4G @ 18-20 kg/ha or Chlorantraniliprole 18.5% SC @ 150 ml/ha.",
        "prevention": "Maintain 2-5 cm water layer in field during granular application; clip leaf tips at nursery.",
        "hindi_summary": "Yellow Stem Borer in Rice: Central shoot dries up (dead heart) or turns white (white ear). Install sex pheromone traps and apply Cartap Hydrochloride."
    },
    "Rice_Healthy": {
        "crop": "Rice",
        "disease_name": "Healthy Crop",
        "pathogen_type": "None",
        "severity": "None",
        "symptoms": "Vibrant green leaves, uniform tillering, no spots, folds, or bore holes observed.",
        "organic_remedy": "Maintain regular monitoring and apply Panchagavya or Jeevamrutha every 15 days.",
        "chemical_remedy": "No chemical application needed. Continue standard NPK balanced nutrition.",
        "prevention": "Ensure proper irrigation scheduling and weed-free field bunds.",
        "hindi_summary": "Your rice crop is completely healthy! No chemical application is needed. Maintain scheduled irrigation and balanced nutrition."
    },

    # -------------------------------------------------------------------------
    # MAIZE DISEASES & PESTS (ICAR-IASRI Taxonomy)
    # -------------------------------------------------------------------------
    "Maize_Maydis_Leaf_Blight": {
        "crop": "Maize",
        "disease_name": "Maydis Leaf Blight / Southern Blight",
        "pathogen_type": "Fungal (Bipolaris maydis)",
        "severity": "High",
        "symptoms": "Small, diamond-shaped or elongated tan lesions with reddish-brown borders between veins.",
        "organic_remedy": "Seed treatment with Trichoderma viride (10g/kg); foliar spray of neem oil (5 ml/L).",
        "chemical_remedy": "Foliar spray with Mancozeb 75% WP @ 2.5 g/L or Azoxystrobin 23% SC @ 1 ml/L.",
        "prevention": "Crop rotation with non-host crops (pulses); destroy previous crop residue.",
        "hindi_summary": "Maydis Leaf Blight in Maize: Rectangular tan lesions with reddish-brown borders. Spray Mancozeb 75% WP or Azoxystrobin, and rotate with non-host crops."
    },
    "Maize_Turcicum_Leaf_Blight": {
        "crop": "Maize",
        "disease_name": "Turcicum Leaf Blight / Northern Corn Leaf Blight",
        "pathogen_type": "Fungal (Exserohilum turcicum)",
        "severity": "High",
        "symptoms": "Long, elliptical, grayish-green or tan cigar-shaped lesions measuring up to 15 cm long.",
        "organic_remedy": "Spray bio-fungicide Bacillus subtilis @ 5 g/L at knee-high stage.",
        "chemical_remedy": "Spray Azoxystrobin 18.2% + Difenoconazole 11.4% SC @ 1 ml/L or Propiconazole @ 1 ml/L.",
        "prevention": "Use certified resistant hybrids; maintain proper plant density to reduce canopy humidity.",
        "hindi_summary": "Turcicum Leaf Blight in Maize: Long elliptical cigar-shaped lesions on leaves. Spray Azoxystrobin or Propiconazole, and use certified resistant hybrids."
    },
    "Maize_Curvularia_Leaf_Spot": {
        "crop": "Maize",
        "disease_name": "Curvularia Leaf Spot",
        "pathogen_type": "Fungal (Curvularia lunata)",
        "severity": "Moderate",
        "symptoms": "Small, circular to oval lesions with light centers and dark reddish-brown margins, often with chlorotic halos.",
        "organic_remedy": "Foliar spray of cow urine-neem extract (1:10 dilution).",
        "chemical_remedy": "Spray Carbendazim 12% + Mancozeb 63% WP (Saaf) @ 2 g/L of water.",
        "prevention": "Ensure good soil drainage; avoid overhead sprinkler irrigation in cloudy weather.",
        "hindi_summary": "Curvularia Leaf Spot in Maize: Small circular spots with light centers and dark reddish margins. Spray Carbendazim + Mancozeb (Saaf) and ensure good drainage."
    },
    "Maize_Sorghum_Downy_Mildew": {
        "crop": "Maize",
        "disease_name": "Sorghum Downy Mildew",
        "pathogen_type": "Fungal-like Oomycete (Peronosclerospora sorghi)",
        "severity": "High",
        "symptoms": "Chlorotic yellowish striping on leaves with white downy growth on the underside; stunted plants with phyllody.",
        "organic_remedy": "Rogue out infected plants immediately and destroy to prevent airborne oospore spread.",
        "chemical_remedy": "Seed dressing with Metalaxyl 35% WS @ 4 g/kg seed; spray Metalaxyl-M + Mancozeb @ 2.5 g/L.",
        "prevention": "Do not grow maize immediately following infected sorghum; sow during dry weather periods.",
        "hindi_summary": "Sorghum Downy Mildew in Maize: Yellow striping on leaves with white downy growth underneath. Spray Metalaxyl-M + Mancozeb and destroy infected plants."
    },
    "Maize_Fall_Armyworm": {
        "crop": "Maize",
        "disease_name": "Fall Armyworm",
        "pathogen_type": "Insect Pest (Spodoptera frugiperda)",
        "severity": "Critical",
        "symptoms": "Pinholes in whorl leaves, extensive window pane feeding, massive sawdust-like fecal frass in central whorl.",
        "organic_remedy": "Apply sand + neem cake (9:1 ratio) in plant whorls; spray Bacillus thuringiensis (Bt) @ 2 g/L.",
        "chemical_remedy": "Apply Emamectin Benzoate 5% SG @ 0.4 g/L or Spinetoram 11.7% SC @ 0.5 ml/L directly into whorls.",
        "prevention": "Install FAW pheromone traps @ 5 traps/acre; encourage predatory earwigs and birds with perches.",
        "hindi_summary": "Fall Armyworm in Maize: Extensive feeding pinholes and frass in central plant whorl. Apply Emamectin Benzoate or Spinetoram directly into whorls."
    },
    "Maize_Aphids": {
        "crop": "Maize",
        "disease_name": "Corn Leaf Aphid",
        "pathogen_type": "Insect Pest (Rhopalosiphum maidis)",
        "severity": "Moderate",
        "symptoms": "Clusters of small bluish-green insects in leaf whorls, tassels, and silks; sticky honeydew and black sooty mold.",
        "organic_remedy": "Spray Neem oil 10,000 ppm @ 2 ml/L or release Coccinellid ladybird beetle predators.",
        "chemical_remedy": "Spray Imidacloprid 17.8% SL @ 0.3 ml/L or Thiamethoxam 25% WG @ 0.3 g/L.",
        "prevention": "Conserve natural beneficial predators; avoid drought stress which encourages aphid multiplication.",
        "hindi_summary": "Corn Leaf Aphid in Maize: Clusters of small insects on leaves and tassels with honeydew. Spray Imidacloprid or Neem oil and avoid drought stress."
    },
    "Maize_Healthy": {
        "crop": "Maize",
        "disease_name": "Healthy Maize Crop",
        "pathogen_type": "None",
        "severity": "None",
        "symptoms": "Broad, vibrant dark green leaves, sturdy stalk, healthy tassel and cob development.",
        "organic_remedy": "Apply Jeevamrutha with irrigation water every 20 days; mulching for moisture retention.",
        "chemical_remedy": "No chemicals required. Provide timely nitrogen top-dressing at knee-high and tasseling stages.",
        "prevention": "Maintain adequate moisture during flowering and cob grain-filling stages.",
        "hindi_summary": "Your maize crop is completely healthy! No pests or lesions observed. Maintain timely irrigation and nitrogen top-dressing."
    },

    # -------------------------------------------------------------------------
    # LEGACY / MULTI-CROP FALLBACK ADVISORIES
    # -------------------------------------------------------------------------
    "Tomato_Early_Blight": {
        "crop": "Tomato",
        "disease_name": "Tomato Early Blight",
        "severity": "Moderate to High",
        "symptoms": "Concentric rings ('target board' spots) on lower leaves.",
        "organic_remedy": "Spray Trichoderma harzianum or copper hydroxide; remove lower infected leaves.",
        "chemical_remedy": "Spray Mancozeb 75% WP @ 2.5 g/L or Chlorothalonil 75% WP @ 2 g/L.",
        "prevention": "Avoid overhead watering; mulch soil to prevent fungal spores splashing onto foliage.",
        "hindi_summary": "Early Blight in Tomato: Concentric rings on lower leaves. Spray Mancozeb or Chlorothalonil, and avoid overhead watering."
    },
    "Tomato_Late_Blight": {
        "crop": "Tomato",
        "disease_name": "Tomato Late Blight",
        "severity": "Critical",
        "symptoms": "Water-soaked dark lesions with white mold on underside in high humidity.",
        "organic_remedy": "Immediate removal of infected vines; preventive copper spray.",
        "chemical_remedy": "Spray Metalaxyl + Mancozeb (Ridomil MZ) @ 2.5 g/L or Cymoxanil + Mancozeb.",
        "prevention": "Provide good air circulation and avoid overhead irrigation during humid weather.",
        "hindi_summary": "Late Blight in Tomato: Water-soaked dark lesions with white mold in high humidity. Spray Metalaxyl + Mancozeb promptly."
    },
    "Tomato_Healthy": {
        "crop": "Tomato",
        "disease_name": "Healthy Tomato",
        "severity": "None",
        "symptoms": "Healthy green foliage with no spots or mold.",
        "organic_remedy": "Routine bio-fertilizer application.",
        "chemical_remedy": "No chemical needed.",
        "prevention": "Maintain scheduled irrigation and staking.",
        "hindi_summary": "Tomato crop is healthy. Maintain scheduled irrigation and staking."
    }
}


def get_disease_advisory(class_label: str) -> dict:
    """
    Retrieves the comprehensive agricultural advisory for a given disease label.
    Falls back gracefully if label is not in database.
    """
    # Direct match
    if class_label in DISEASE_ADVISORY_DB:
        return DISEASE_ADVISORY_DB[class_label]

    # Flexible matching (case-insensitive and partial)
    normalized = class_label.lower().replace("___", "_").replace("-", "_").replace(" ", "_")
    for key, data in DISEASE_ADVISORY_DB.items():
        if key.lower() == normalized or normalized in key.lower():
            return data

    # Default fallback advisory
    crop_name = "Crop"
    if "rice" in normalized:
        crop_name = "Rice"
    elif "maize" in normalized or "corn" in normalized:
        crop_name = "Maize"
    elif "tomato" in normalized:
        crop_name = "Tomato"

    return {
        "crop": crop_name,
        "disease_name": class_label.replace("_", " "),
        "severity": "Moderate",
        "symptoms": "Symptoms consistent with classified crop condition.",
        "organic_remedy": "Isolate affected plants and apply broad-spectrum Neem Oil (5ml/L).",
        "chemical_remedy": "Consult local Krishi Vigyan Kendra (KVK) or agricultural extension officer.",
        "prevention": "Maintain clean field sanitation and balanced irrigation.",
        "hindi_summary": f"Symptoms consistent with {class_label.replace('_', ' ')} detected in {crop_name}. Consult local Krishi Vigyan Kendra (KVK)."
    }
