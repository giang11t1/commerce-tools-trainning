// lib/mock-order.ts

export const fakeOrder = {
    id: '6a8d628f-f904-83ec-9979-6c02e85b89e0',
    orderNumber: 'FAKE-10001',
    orderState: 'Confirmed',
    paymentState: 'Paid',
    shipmentState: 'Pending',

    customerEmail: 'test@example.com',

    createdAt: new Date().toISOString(),

    billingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        streetName: '123 Main Street',
        city: 'New York',
        postalCode: '10001',
        state: 'NY',
        country: 'US',
    },

    shippingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        streetName: '123 Main Street',
        city: 'New York',
        postalCode: '10001',
        state: 'NY',
        country: 'US',
    },

    lineItems: [
        {
            id: 'fake-line-item-1',
            productId: 'fake-product-001',
            productKey: 'sample-product',
            name: 'Sample Product',
            variant: {
                id: 1,
                sku: 'SAMPLE-001',
            },
            quantity: 2,
            price: {
                currencyCode: 'USD',
                centAmount: 2500,
            },
            totalPrice: {
                currencyCode: 'USD',
                centAmount: 5000,
            },
        },
    ],

    subtotal: {
        currencyCode: 'USD',
        centAmount: 5000,
    },

    shipping: {
        currencyCode: 'USD',
        centAmount: 1000,
    },

    tax: {
        currencyCode: 'USD',
        centAmount: 480,
    },

    totalPrice: {
        currencyCode: 'USD',
        centAmount: 15214,
    },

    shippingMethod: {
        name: 'Standard Shipping',
        price: {
            currencyCode: 'USD',
            centAmount: 1000,
        },
    },
};
