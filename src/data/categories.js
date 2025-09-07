export const categories = [
  {
    id: "TodayNews",
    name: "Today News",
    description: "Latest news from today",
    color: "#3b82f6"  // 正确的Today News蓝色
  },
  {
    id: "PastNews",
    name: "Past News",
    description: "Archive of past news articles",
    color: "#6b7280"  // 正确的Past News灰色
  }
];

export function getCategoryById(id) {
  return categories.find(category => category.id === id) || null;
}

export function getCategoryColor(id) {
  const category = getCategoryById(id);
  return category ? category.color : null;
}