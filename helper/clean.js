function removeNull(obj) {
  Object.entries(obj).forEach(([key, value]) => {
    if (value == null) delete obj[key]

    if (typeof value == 'object') removeNull(value)
  })
  return obj
}
export { removeNull }
