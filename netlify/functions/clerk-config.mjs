export default async () => {
  const pk = process.env.CLERK_PUBLISHABLE_KEY ?? "";
  return new Response(JSON.stringify({ pk }), {
    headers: { "Content-Type": "application/json" },
  });
};
