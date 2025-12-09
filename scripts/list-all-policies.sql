-- Query all RLS policies for trips and trip_participants tables
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('trips', 'trip_participants')
ORDER BY tablename, cmd, policyname;
