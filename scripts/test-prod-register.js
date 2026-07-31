async function main() {
  const response = await fetch('https://sanjeev-e-learn-pro-backend-1.onrender.com/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Prod Role Check',
      email: `prod-role-check-${Date.now()}@test.com`,
      password: 'Test1234',
      role: 'instructor',
    }),
  });

  const body = await response.text();
  console.log('status', response.status);
  console.log(body);
}

main().catch((error) => console.error(error.message));
