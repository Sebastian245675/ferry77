-- Add delivery_time column to proposals table
ALTER TABLE proposals ADD COLUMN delivery_time VARCHAR(100) AFTER status;