/*
 * @Author: 姜彦汐
 * @Date: 2021-04-19 13:10:33
 * @LastEditors: 姜彦汐
 * @LastEditTime: 2023-12-22 21:29:51
 * @Description:
 * @Site: https://www.undsky.com
 */
module.exports = {
  page(params, currentPage, pageSize) {
    if (null !== params && !Array.isArray(params) && arguments.length > 0) {
      params = Array.from(arguments);
      currentPage = pageSize = undefined;
    }
    const {
      config: {
        mybatis: { defaultPageSize, pageOffset, currentPageName, pageSizeName },
      },
      ctx: {
        request: { body },
        query,
      },
    } = this;
    const _page =
      "undefined" == typeof currentPage
        ? body[currentPageName] || query[currentPageName] || pageOffset
        : currentPage;
    const _size =
      "undefined" == typeof pageSize
        ? body[pageSizeName] || query[pageSizeName] || defaultPageSize
        : pageSize;
    const _limit = [(_page - pageOffset) * _size, parseInt(_size)];
    if (Array.isArray(params)) {
      return params.concat(_limit).concat(params);
    }
    return _limit;
  },
};
