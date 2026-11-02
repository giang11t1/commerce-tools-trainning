import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';
import { ctpClient } from './client';

const projectKey: string = process.env.CT_PROJECT_KEY ?? '';

if (!projectKey) {
    throw new Error('Missing CT_PROJECT_KEY');
}

const apiRoot = createApiBuilderFromCtpClient(ctpClient);

export async function getProductSelections() {
    const response = await apiRoot
        .withProjectKey({ projectKey })
        .productSelections()
        .get()
        .execute();

    console.log('PRODUCT SELECTIONS:', response.body);

    return response.body;
}


export async function getProductSelectionByKey(key: string) {
    const response = await apiRoot
        .withProjectKey({ projectKey })
        .productSelections()
        .withKey({ key })
        .get()
        .execute();

    console.log('PRODUCT SELECTION:', response.body);

    return response.body;
}

export async function getProductSelectionProducts(
    productSelectionId: string
) {
    const response = await apiRoot
        .withProjectKey({ projectKey })
        .productSelections()
        .withId({ ID: productSelectionId })
        .products()
        .get()
        .execute();

    console.log(
        'PRODUCT SELECTION PRODUCTS:',
        response.body
    );

    return response.body;
}

export async function getStoreByKey(storeKey: string) {
    const response = await apiRoot
        .withProjectKey({ projectKey })
        .stores()
        .withKey({ key: storeKey })
        .get()
        .execute();

    console.log('STORE:', response.body);

    return response.body;
}
