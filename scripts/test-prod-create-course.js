async function login(email, password) {
  const response = await fetch('https://sanjeev-e-learn-pro-backend-1.onrender.com/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  console.log('login status', response.status, data.message || data.error);
  return data.token;
}

async function createCourse(token, payload) {
  const response = await fetch('https://sanjeev-e-learn-pro-backend-1.onrender.com/api/courses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  console.log('create status', response.status);
  console.log(text.slice(0, 500));
}

async function main() {
  const token = await login('testinstructor1@gmail.com', 'Test1234');
  if (!token) return;

  await createCourse(token, {
    title: 'API Debug Course',
    description: 'Short description for testing',
    category: 'Web Development',
    level: 'beginner',
    duration: '4h',
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
  });
}

main().catch((error) => console.error(error.message));
