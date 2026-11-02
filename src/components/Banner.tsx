'use client';
import Link from 'next/link';
import Hero from '@/components/commercetools-ui/organisms/content/hero';

export default function Banner() {
    return (

        <>
            <Hero
                image={{
                        media: {
                            mediaId: 'w6m0l0rw2j8okyyv0twm',
                            file: 'https://res.cloudinary.com/dlwdq84ig/image/upload/v1704277263/w6m0l0rw2j8okyyv0twm.jpg',
                        },
                        fill: true,
                    }
                }
                src='https://res.cloudinary.com/dlwdq84ig/image/upload/c_fill,ar_16:9,w_3840,g_faces:auto/f_auto/q_20/v1/svvbad0vkrdy8jrc8ozy?_a=BAVMn6AQ0'
                title="Here are some lovely texts just for testing if things go great, hopefully so"
                subtitle="Here are some lovely Subtitle texts just for testing"
                ctaLabel="Call To Action"
                imageQuality={75}
                isPriority={false}
            />

        </>
    );
}
