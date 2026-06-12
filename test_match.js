const normalizeName = (name) => {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[^a-z\s]/g, '') // remove punctuation (dashes become empty string? NO! Wait!)
    .trim()
    .replace(/\s+/g, ' '); // collapse spaces
};

console.log("normalize In-beom:", normalizeName("In-beom"));
console.log("normalize Hwang In-beom:", normalizeName("Hwang In-beom"));

const n = normalizeName("Hwang In-beom");
const rawFirstName = normalizeName("In-beom");
const rawLastName = normalizeName("Hwang");

console.log("n:", n);
console.log("rawFirstName:", rawFirstName);
console.log("rawLastName:", rawLastName);
console.log("includes last:", n.includes(rawLastName));
console.log("includes first:", n.includes(rawFirstName));
