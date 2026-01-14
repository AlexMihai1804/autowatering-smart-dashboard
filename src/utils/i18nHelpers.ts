/**
 * i18n Translation Helpers
 * 
 * Helper functions to translate database values that come in English
 * to the user's selected language.
 */

/**
 * Translate plant category from database value to localized string
 */
export const translatePlantCategory = (category: string, t: (key: string) => string): string => {
    const categoryMap: Record<string, string> = {
        'Agriculture': 'plantCategories.agriculture',
        'Gardening': 'plantCategories.gardening',
        'Landscaping': 'plantCategories.landscaping',
        'Indoor': 'plantCategories.indoor',
        'Succulent': 'plantCategories.succulent',
        'Fruit': 'plantCategories.fruit',
        'Vegetable': 'plantCategories.vegetable',
        'Herb': 'plantCategories.herb',
        'Lawn': 'plantCategories.lawn',
        'Shrub': 'plantCategories.shrub'
    };
    
    const key = categoryMap[category];
    return key ? t(key) : category;
};

/**
 * Translate soil texture from database value to localized string
 */
export const translateSoilTexture = (texture: string | undefined, t: (key: string) => string): string => {
    if (!texture) return '';
    const textureMap: Record<string, string> = {
        'Sand': 'soilTextures.sand',
        'Loamy Sand': 'soilTextures.loamySand',
        'Sandy Loam': 'soilTextures.sandyLoam',
        'Loam': 'soilTextures.loam',
        'Silt Loam': 'soilTextures.siltLoam',
        'Clay Loam': 'soilTextures.clayLoam',
        'Sandy Clay Loam': 'soilTextures.sandyClayLoam',
        'Silty Clay Loam': 'soilTextures.siltyClayLoam',
        'Clay': 'soilTextures.clay',
        'Silty Clay': 'soilTextures.siltyClay',
        'Sandy Clay': 'soilTextures.sandyClay'
    };
    
    const key = textureMap[texture];
    return key ? t(key) : texture;
};
