'use client';

import {
    createContext,
    FC,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import {ProductProjection} from "@commercetools/platform-sdk";

const COMPARE_STORAGE_KEY = 'compare-products';

export const MAX_COMPARE_PRODUCTS = 10;

type CompareContextType = {
    compareProducts: ProductProjection[];
    addToCompare: (product: ProductProjection) => boolean;
    removeFromCompare: (productId: string) => void;
    isInCompare: (productId: string) => boolean;
    clearCompare: () => void;
    isCompareLimitReached: boolean;
};

type CompareProviderProps = {
    children: ReactNode;
};

const CompareContext = createContext<CompareContextType | undefined>(
    undefined
);

export const CompareProvider: FC<CompareProviderProps> = ({
                                                              children,
                                                          }) => {
    const [compareProducts, setCompareProducts] = useState<
        ProductProjection[]
    >([]);

    const [isInitialized, setIsInitialized] = useState(false);

    /**
     * Load products from localStorage
     */
    useEffect(() => {
        try {
            const storedProducts = localStorage.getItem(
                COMPARE_STORAGE_KEY
            );

            if (storedProducts) {
                const parsedProducts = JSON.parse(storedProducts);

                if (Array.isArray(parsedProducts)) {
                    const uniqueProducts =
                        parsedProducts.filter(
                            (
                                product,
                                index,
                                products
                            ) =>
                                product?.id &&
                                products.findIndex(
                                    (item) =>
                                        item?.id === product.id
                                ) === index
                        );

                    setCompareProducts(
                        uniqueProducts.slice(
                            0,
                            MAX_COMPARE_PRODUCTS
                        )
                    );
                }
            }
        } catch (error) {
            console.error(
                'Failed to load compare products:',
                error
            );
        } finally {
            setIsInitialized(true);
        }
    }, []);

    /**
     * Save products to localStorage
     */
    useEffect(() => {
        if (!isInitialized) {
            return;
        }

        try {
            localStorage.setItem(
                COMPARE_STORAGE_KEY,
                JSON.stringify(compareProducts)
            );
        } catch (error) {
            console.error(
                'Failed to save compare products:',
                error
            );
        }
    }, [compareProducts, isInitialized]);

    /**
     * Add product to compare
     */
    const addToCompare = useCallback(
        (product: ProductProjection): boolean => {
            if (!product?.id) {
                return false;
            }

            // Check current state before adding
            if (
                compareProducts.some(
                    (item) => item.id === product.id
                )
            ) {
                return false;
            }

            if (
                compareProducts.length >= MAX_COMPARE_PRODUCTS
            ) {
                return false;
            }

            setCompareProducts((currentProducts) => {
                // Double-check inside state update
                if (
                    currentProducts.some(
                        (item) => item.id === product.id
                    )
                ) {
                    return currentProducts;
                }

                if (
                    currentProducts.length >=
                    MAX_COMPARE_PRODUCTS
                ) {
                    return currentProducts;
                }

                return [...currentProducts, product];
            });

            return true;
        },
        [compareProducts]
    );

    /**
     * Remove product from compare
     */
    const removeFromCompare = useCallback(
        (productId: string) => {
            if (!productId) {
                return;
            }

            setCompareProducts((currentProducts) =>
                currentProducts.filter(
                    (product) => product.id !== productId
                )
            );
        },
        []
    );

    /**
     * Check whether product is in compare
     */
    const isInCompare = useCallback(
        (productId: string): boolean => {
            return compareProducts.some(
                (product) => product.id === productId
            );
        },
        [compareProducts]
    );

    /**
     * Remove all compare products
     */
    const clearCompare = useCallback(() => {
        setCompareProducts([]);
    }, []);

    const isCompareLimitReached =
        compareProducts.length >= MAX_COMPARE_PRODUCTS;

    return (
        <CompareContext.Provider
            value={{
                compareProducts,
                addToCompare,
                removeFromCompare,
                isInCompare,
                clearCompare,
                isCompareLimitReached,
            }}
        >
            {children}
        </CompareContext.Provider>
    );
};

export const useCompare = (): CompareContextType => {
    const context = useContext(CompareContext);

    if (!context) {
        throw new Error(
            'useCompare must be used within CompareProvider'
        );
    }

    return context;
};
