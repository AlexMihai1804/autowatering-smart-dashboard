export const PLANT_TYPES = [
    'Vegetables', 'Herbs', 'Flowers', 'Shrubs', 'Trees', 'Lawn', 'Succulents', 'Custom'
];

export const SOIL_TYPES = [
    'Clay', 'Sandy', 'Loamy', 'Silty', 'Rocky', 'Peaty', 'Potting Mix', 'Hydroponic'
];

export const IRRIGATION_METHODS = [
    'Drip', 'Sprinkler', 'Soaker Hose', 'Micro Spray', 'Hand Watering', 'Flood'
];

export const getPlantIcon = (typeIndex: number): string => {
    switch (typeIndex) {
        case 0: return '🍅'; // Vegetables
        case 1: return '🌿'; // Herbs
        case 2: return '🌸'; // Flowers
        case 3: return '🌳'; // Shrubs
        case 4: return '🌲'; // Trees
        case 5: return '🌱'; // Lawn
        case 6: return '🌵'; // Succulents
        default: return '✨'; // Custom
    }
};
