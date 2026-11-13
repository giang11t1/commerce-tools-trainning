import { notFound } from 'next/navigation';
import CartInspector from './cart-inspector';

const MINIMUM_TOKEN_LENGTH = 32;

export default function CartInspectorPage() {
    if (process.env.NODE_ENV === 'production') notFound();

    const enabled =
        typeof process.env.CART_INSPECTOR_ACCESS_TOKEN === 'string' &&
        process.env.CART_INSPECTOR_ACCESS_TOKEN.length >= MINIMUM_TOKEN_LENGTH;

    return <CartInspector enabled={enabled} />;
}
