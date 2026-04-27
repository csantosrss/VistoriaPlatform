import type { Request, Response } from "express";
import { CorrelationIdMiddleware } from "./correlation-id.middleware";
import { CORRELATION_ID_HEADER } from "../constants";

function makeReq(headerValue?: string): Request {
  return {
    header: (name: string) =>
      name.toLowerCase() === CORRELATION_ID_HEADER ? headerValue : undefined,
  } as unknown as Request;
}

function makeRes(): { res: Response; setHeader: jest.Mock } {
  const setHeader = jest.fn();
  const res = { setHeader } as unknown as Response;
  return { res, setHeader };
}

describe("CorrelationIdMiddleware", () => {
  const middleware = new CorrelationIdMiddleware();

  it("reuses incoming x-correlation-id header", () => {
    const req = makeReq("abc-123");
    const { res, setHeader } = makeRes();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.correlationId).toBe("abc-123");
    expect(setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, "abc-123");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("generates a new uuid when header is missing", () => {
    const req = makeReq(undefined);
    const { res, setHeader } = makeRes();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      req.correlationId,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("generates a new uuid when header is empty string", () => {
    const req = makeReq("");
    const { res, setHeader } = makeRes();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.correlationId).toBeDefined();
    expect(req.correlationId).not.toBe("");
    expect(setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      req.correlationId,
    );
  });
});
