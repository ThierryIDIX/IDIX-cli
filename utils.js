export function slugify(text) {
  // eslint-disable-next-line
  return (
    text
      .toString() // Cast to string
      .toLowerCase() // Convert the string to lowercase letters
      .normalize("NFD") // The normalize() method returns the Unicode Normalization Form of a given string.
      .trim() // Remove whitespace from both sides of a string
      .replace(/\s+/g, "-") // Replace spaces with -
      // eslint-disable-next-line
      .replace(/[^\w\-]+/g, "") // Remove all non-word chars
      // eslint-disable-next-line
      .replace(/\-\-+/g, "-")
  ); // Replace multiple - with single -
}
