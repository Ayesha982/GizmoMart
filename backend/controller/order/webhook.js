const stripe = require('../../config/stripe');
const addToCartModel = require('../../models/cartProduct');
const orderModel = require('../../models/orderProductModel');
const nodemailer = require('nodemailer');

const endpointSecret = process.env.STRIPE_ENDPOINT_WEBHOOK_SECRET_KEY;

// Function to fetch product details
async function getLineItems(lineItems) {
    try {
        let ProductItems = [];
        if (lineItems?.data?.length) {
            for (const item of lineItems.data) {
                const product = await stripe.products.retrieve(item.price.product);
                ProductItems.push({
                    productId: product.metadata.productId,
                    name: product.name,
                    price: item.price.unit_amount / 100,
                    quantity: item.quantity,
                    image: product.images
                });
            }
        }
        return ProductItems;
    } catch (error) {
        console.error("Error fetching line items:", error);
        return [];
    }
}

// Function to send email notifications
async function sendEmail(orderDetails) {
    try {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: `"GizmoMart" <${process.env.EMAIL_USER}>`,
            to: orderDetails.email,
            subject: "Payment Confirmation - GizmoMart",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: black;">
                        <span style="background-color: #f4c95d; padding: 3px 8px; border-radius: 5px;">Payment</span>
                        Confirmation - GizmoMart
                    </h2>
                    <p>Thank you for your <span style="background-color: #f4c95d; padding: 2px 5px; border-radius: 3px;">payment</span>, <strong>${orderDetails.email}</strong>!</p>
                    <p>Your <span style="background-color: #f4c95d; padding: 2px 5px; border-radius: 3px;">payment</span> has been successfully processed.</p>
                    <p><strong>Payment ID:</strong> <span style="background-color: #f4c95d; padding: 2px 5px; border-radius: 3px;">${orderDetails.paymentDetails.paymentId}</span></p>
                    <p><strong>Total Amount Paid:</strong> ₹${orderDetails.totalAmount}</p>
                    <p>We will notify you once your order is processed.</p>
                    <h3>Order Details:</h3>
                    <ul>
                        ${orderDetails.productDetails.map(product => `
                            <li><strong>${product.name}</strong> - ₹${product.price} x ${product.quantity}</li>
                        `).join('')}
                    </ul>
                    <p>For any queries, contact us at 
                    <a href="mailto:support@gizomart.com" style="color: blue; text-decoration: none;">support@gizomart.com</a></p>
                    <p>Regards,</p>
                    <p><strong>GizmoMart Team</strong></p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(" Payment Confirmation Email sent successfully");
    } catch (error) {
        console.error(" Error sending email:", error);
    }
}

// Webhook function to handle Stripe events
const webhooks = async (request, response) => {
    try {
        const sig = request.headers['stripe-signature'];
        const payloadString = JSON.stringify(request.body);

        // Verify Stripe webhook signature
        const header = stripe.webhooks.generateTestHeaderString({
            payload: payloadString,
            secret: endpointSecret,
        });

        let event;
        try {
            event = stripe.webhooks.constructEvent(payloadString, header, endpointSecret);
        } catch (err) {
            console.error(" Webhook Signature Verification Failed:", err.message);
            return response.status(400).send(`Webhook Error: ${err.message}`);
        }

        switch (event.type) {
            case 'checkout.session.completed':
                console.log("Checkout session completed!");

                const session = event.data.object;
                const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
                const productDetails = await getLineItems(lineItems);

                const orderDetails = {
                    productDetails,
                    email: session.customer_email,
                    userId: session.metadata.userId,
                    paymentDetails: {
                        paymentId: session.payment_intent,
                        payment_method_type: session.payment_method_types[0],
                        payment_status: session.payment_status
                    },
                    shipping_options: session.shipping_options?.map(s => ({
                        ...s,
                        shipping_amount: s.shipping_amount / 100
                    })) || [],
                    totalAmount: session.amount_total / 100
                };

                // Save order to database
                const order = new orderModel(orderDetails);
                const saveOrder = await order.save();

                if (saveOrder?._id) {
                    console.log(" Order saved successfully:", saveOrder._id);

                    // Clear user's cart
                    await addToCartModel.deleteMany({ userId: session.metadata.userId });
                    console.log(" User cart cleared!");

                    // Send confirmation email
                    await sendEmail(orderDetails);
                } else {
                    console.error(" Failed to save order!");
                }
                break;

            default:
                console.warn(` Unhandled event type: ${event.type}`);
        }

        response.status(200).send();
    } catch (error) {
        console.error(" Webhook Processing Error:", error);
        response.status(500).send("Internal Server Error");
    }
};

module.exports = webhooks;
