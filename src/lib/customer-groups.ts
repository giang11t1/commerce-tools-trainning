import {
    createApiBuilderFromCtpClient,
    type CustomerGroup,
} from '@commercetools/platform-sdk';
import { ctpClient } from './client';

const apiRoot = createApiBuilderFromCtpClient(ctpClient);

export async function createWholesaleCustomerGroup() {
    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .customerGroups()
        .post({
            body: {
                key: 'wholesale',
                groupName: 'Wholesale',
            },
        })
        .execute();

    return response.body;
}

export async function getWholesaleCustomerGroup(): Promise<CustomerGroup> {
    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .customerGroups()
        .get({
            queryArgs: {
                where: 'key="wholesale"',
            },
        })
        .execute();

    const group = response.body.results[0];

    if (!group) {
        throw new Error('Wholesale Customer Group not found');
    }

    return group;
}


export async function getCustomerByEmail(email: string) {
    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .customers()
        .get({
            queryArgs: {
                where: `email="${email}"`,
            },
        })
        .execute();

    return response.body.results[0];
}

export async function setCustomerGroup(
    customerId: string,
    customerVersion: number,
    customerGroupId: string,
) {
    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .customers()
        .withId({
            ID: customerId,
        })
        .post({
            body: {
                version: customerVersion,
                actions: [
                    {
                        action: 'setCustomerGroup',
                        customerGroup: {
                            typeId: 'customer-group',
                            id: customerGroupId,
                        },
                    },
                ],
            },
        })
        .execute();

    return response.body;
}


export async function getCustomerGroupById(id: string) {
    try {
        const response = await apiRoot
            .withProjectKey({
                projectKey: process.env.CT_PROJECT_KEY!,
            })
            .customerGroups()
            .withId({ ID: id })
            .get()
            .execute();

        return response.body;
    } catch (error) {
        console.error('Error fetching customer group:', error);
        return null;
    }
}
