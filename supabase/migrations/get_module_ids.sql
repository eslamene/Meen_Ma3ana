-- Get the actual module IDs and names from database
SELECT 
  id,
  name,
  display_name,
  order_index
FROM permission_modules
ORDER BY order_index;

