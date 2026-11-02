type CustomerOrder = {
    customerId?: string;
};

export function isOrderOwnedByCustomer(
    order: CustomerOrder,
    customerId: string,
): boolean {
    return order.customerId === customerId;
}
