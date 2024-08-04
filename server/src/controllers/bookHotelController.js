import { Booking, insertBooking, findBookingByBookingId, findBookingByCustomerId, updateBookingStatus, removeBooking } from "../models/booking.js";
import { sendBookingConfirmationEmail } from "./sendEmailController.js";
import { fetchHotel } from "../models/hotel.js"; 
import Stripe from 'stripe';
import 'dotenv/config'

const stripe = Stripe(process.env.STRIPE_TEST_KEY);

async function viewBooking(req, res, next) {
    const id  = req.params.id; // Booking ID
    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    try {
        const booking = await findBookingByBookingId(id);
        res.json(booking);
    } catch (error) {
        res.status(500).json({ error: error.message || error });
    }
}

async function viewCustomerBookings(req, res, next) {
    const id  = req.params.id; // Customer ID
    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    try {
        const bookings = await findBookingByCustomerId(id);
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message || error });
    }
}

async function cancelBooking(req, res, next) {
    const id  = req.params.id; // Booking ID
    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');

    // Step 2: If refund successful (approved), remove booking from database
    try {
        await updateBookingStatus(id, "cancelled");
        res.send("Success: booking cancelled");
    } catch (error) {
        res.status(500).json({ error: error.message || error });
    }
}

async function createBooking(req, res, next) {
    // This controller method is only called once the payment has been processed
    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    const {
        billingEmail,
        // Booking data below:
        destinationId,
        hotelId,
        roomKey,
        customerId,
        numberOfNights,
        startDate,
        endDate,
        numAdults,
        numChildren,
        msgToHotel,
        roomTypes,
        price,
        guestSalutation,
        guestFirstName,
        guestLastName,
        paymentId,
        payeeId} = req.body;

    // Step 2: If payment successful, create booking
    const booking = new Booking(null, // bookingId: dummy value (will be generated on database insertion)
        "confirmed", // status
        destinationId,
        hotelId,
        roomKey,
        customerId,
        numberOfNights,
        startDate,
        endDate,
        numAdults,
        numChildren,
        msgToHotel,
        roomTypes,
        price,
        guestSalutation,
        guestFirstName,
        guestLastName,
        paymentId,
        payeeId);
    // If customer not logged-in, customerId will be null

    const bookingId = await insertBooking(booking); // Booking ID generated by database upon insertion (auto-increment primary key)
    booking.bookingId = bookingId; // update Booking instance

    // Step 3: Send booking confirmation email
    const bookedHotel = await fetchHotel(booking.hotelId); // To get the details of the booked hotel
    await sendBookingConfirmationEmail(booking, bookedHotel, billingEmail);

    // Step 4: respond back with success message
    res.json({bookingId: bookingId});
}

async function createStripeCheckout(req, res, next) {
    const session = await stripe.checkout.sessions.create({
    line_items: [
        {
        price_data: {
            currency: 'usd',
            product_data: {
            name: 'T-shirt',
            }, 
            unit_amount: 2000,
        },
        quantity: 1,
        },
    ],
    metadata: req.body.bookingInformation, // metadata must be single object where values are strings (i.e. NO nested objects)
    mode: 'payment',
    success_url: `${process.env.CLIENT_URL}/success`,
    cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });
    // console.log("Receive booking information: ", bookingInformation);
  res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.send(session);
}

async function stripeWebhook(req, res, next) {
    const event = req.body;

    switch(event.type){
        case('checkout.session.completed'):
            const checkoutSession = event.data.object;
            const bookingInformation = checkoutSession.metadata
            const billingEmail = checkoutSession.customer_details.email
            const payeeId = checkoutSession.payment_intent
            const paymentIntentSession = await stripe.paymentIntents.retrieve(payeeId)
            const paymentId = paymentIntentSession.latest_charge;

            const combinedBookingInformationForDB = {
                billingEmail,
                ...bookingInformation,
                paymentId,
                payeeId
            }

            try {
                // Send the combined booking information to the createBooking route
                await axios.post('http://localhost:5000/booking/create', combinedBookingInformationForDB);
            } catch (error) {
                console.error('Error creating booking:', error);
            }
            break;
        case('payment_intent.created'):
            const paymentIntentCreatedSession = event.data.object;
            paymentIntentCreatedSession.receipt_email = process.env.MAIL_USER;
            console.log(paymentIntentCreatedSession);
    }

    res.sendStatus(200);
}

export { viewBooking, viewCustomerBookings, cancelBooking, createBooking, createStripeCheckout, stripeWebhook };

