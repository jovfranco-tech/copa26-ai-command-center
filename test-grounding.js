async function run() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Who got red cards in the recent Mexico vs South Africa match?" }] }],
      tools: [{ googleSearch: {} }]
    })
  });
  console.log(await res.text());
}
run();
