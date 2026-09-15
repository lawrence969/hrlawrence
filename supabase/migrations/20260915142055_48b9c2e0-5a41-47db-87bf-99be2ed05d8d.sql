DO $$
BEGIN
  PERFORM public._merge_profile('18c35155-8953-40ef-937c-5a274eda9e73'::uuid, '5f08b2d3-90b8-4a09-971f-2abdff2c8408'::uuid);
  PERFORM public._merge_profile('dbd46c05-5034-4217-8b54-6f95364ec3c9'::uuid, '5f08b2d3-90b8-4a09-971f-2abdff2c8408'::uuid);
END $$;

UPDATE public.profiles
SET first_name = 'Candy and Arthur', last_name = 'Blumer', updated_at = now()
WHERE id = '5f08b2d3-90b8-4a09-971f-2abdff2c8408';