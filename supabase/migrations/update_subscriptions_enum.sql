-- Create status enum for subscriptions
CREATE TYPE subscription_status AS ENUM ('active', 'pending', 'trialing', 'past_due', 'cancelled');

-- Update subscriptions table to use enum
ALTER TABLE subscriptions 
ALTER COLUMN status TYPE subscription_status 
USING status::subscription_status;

-- Set default to 'pending' for new subscriptions (will be set to 'active' after payment)
ALTER TABLE subscriptions 
ALTER COLUMN status SET DEFAULT 'pending';

-- Create index on status for filtering active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Create composite index for user_id + status lookups (common query pattern)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
