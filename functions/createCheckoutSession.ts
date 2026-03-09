import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const { productId, productName, productPrice, productImage, successUrl, cancelUrl } = await req.json();

    if (!productName || !productPrice) {
      return Response.json({ error: 'Missing required product fields' }, { status: 400 });
    }

    const imageUrls = productImage && productImage.startsWith('https://') ? [productImage] : [];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              ...(imageUrls.length > 0 && { images: imageUrls }),
            },
            unit_amount: Math.round(productPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || 'https://lbcnetwork.base44.app/Marketplace?success=1',
      cancel_url: cancelUrl || 'https://lbcnetwork.base44.app/Marketplace',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        product_id: productId || '',
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});