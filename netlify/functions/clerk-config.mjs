export const handler = async () => {
  const pk = process.env.CLERK_PUBLISHABLE_KEY ?? "";
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pk }),
  };
};
