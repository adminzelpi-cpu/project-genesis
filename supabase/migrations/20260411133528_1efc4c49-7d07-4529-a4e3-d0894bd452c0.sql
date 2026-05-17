-- Clean up legacy Twilio data from test store
DELETE FROM whatsapp_phone_numbers WHERE store_id = 'a1171180-b1b3-4c4e-8f6e-fd80c1fe4f64' AND phone_number = '+14155238886';
DELETE FROM whatsapp_providers WHERE store_id = 'a1171180-b1b3-4c4e-8f6e-fd80c1fe4f64' AND provider_type = 'twilio';