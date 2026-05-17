const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://irldjacvpnjnsdfejbue.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybGRqYWN2cG5qbnNkZmVqYnVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTk2OTksImV4cCI6MjA5NDQ3NTY5OX0.2YN5SKaYwRSo9YEztgsHfkyUJlIal_e1wDCZyjxh1RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Attempting to update category...');
  const { data, error } = await supabase
    .from('products')
    .update({ category: 'Cá khô' })
    .eq('id', 'e542c2d4-714b-4179-b743-3ea14ec59415')
    .select();

  if (error) {
    console.error('Error during update:', error);
  } else {
    console.log('Result after update:', data);
  }
}

run();
