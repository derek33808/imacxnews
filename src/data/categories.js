export const categories = [
  {
    id: "TodayNews",
    name: "Today News",
    description: "Latest news from today",
    color: "var(--color-primary)"
  },
  {
    id: "PastNews",
    name: "Past News",
    description: "Archive of past news articles",
    color: "var(--color-primary-dark)"
  }
];

export function getCategoryById(id) {
  return categories.find(category => category.id === id) || null;
}

export function getCategoryColor(id) {
  const category = getCategoryById(id);
  return category ? category.color : null;
}