import { DEFAULT_PAGE_SIZE, toHttpParams } from "./pagination";

describe("toHttpParams", () => {
  it("incluye page y pageSize", () => {
    const params = toHttpParams({ page: 2, pageSize: 20 });
    expect(params.get("page")).toBe("2");
    expect(params.get("pageSize")).toBe("20");
  });

  it("omite sortBy/sortOrder cuando no se pasan", () => {
    const params = toHttpParams({ page: 1, pageSize: 10 });
    expect(params.has("sortBy")).toBe(false);
    expect(params.has("sortOrder")).toBe(false);
  });

  it("incluye sortBy y sortOrder cuando se pasan", () => {
    const params = toHttpParams({ page: 1, pageSize: 10, sortBy: "name", sortOrder: "asc" });
    expect(params.get("sortBy")).toBe("name");
    expect(params.get("sortOrder")).toBe("asc");
  });

  it("expone un DEFAULT_PAGE_SIZE razonable", () => {
    expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
  });
});
