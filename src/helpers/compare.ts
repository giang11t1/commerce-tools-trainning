const COMPARE_STORAGE_KEY = 'compare-products';
const MAX_COMPARE_PRODUCTS = 4;

export const getCompareProducts = (): string[] => {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        return JSON.parse(
            localStorage.getItem(COMPARE_STORAGE_KEY) || '[]'
        );
    } catch {
        return [];
    }
};

export const isProductInCompare = (productId: string): boolean => {
    return getCompareProducts().includes(productId);
};

export const addProductToCompare = (productId: string): string[] => {
    const products = getCompareProducts();

    if (!productId || products.includes(productId)) {
        return products;
    }

    if (products.length >= MAX_COMPARE_PRODUCTS) {
        return products;
    }

    const updatedProducts = [...products, productId];

    localStorage.setItem(
        COMPARE_STORAGE_KEY,
        JSON.stringify(updatedProducts)
    );

    window.dispatchEvent(new Event('compare-products-updated'));

    return updatedProducts;
};

export const removeProductFromCompare = (
    productId: string
): string[] => {
    const updatedProducts = getCompareProducts().filter(
        (id) => id !== productId
    );

    localStorage.setItem(
        COMPARE_STORAGE_KEY,
        JSON.stringify(updatedProducts)
    );

    window.dispatchEvent(new Event('compare-products-updated'));

    return updatedProducts;
};

export const clearCompareProducts = (): void => {
    localStorage.removeItem(COMPARE_STORAGE_KEY);

    window.dispatchEvent(new Event('compare-products-updated'));
};
