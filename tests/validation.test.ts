import { describe, expect, it } from "vitest";
import {
  GARMENT_CODES,
  MAX_IMAGE_BYTES,
  PERSON_CODES,
  ValidationError,
  validateImageDataUri,
} from "@/lib/validation";

/** Everything here runs before a paid generation, so it is the cheapest guard we have. */

const PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function dataUriOfSize(bytes: number, mime = "image/jpeg") {
  return `data:${mime};base64,${Buffer.alloc(bytes).toString("base64")}`;
}

describe("validateImageDataUri", () => {
  it("accepts a PNG data URI", () => {
    const result = validateImageDataUri(PIXEL_PNG, PERSON_CODES);
    expect(result.mime).toBe("image/png");
    expect(result.bytes).toBeGreaterThan(0);
  });

  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (mime) => {
    expect(validateImageDataUri(dataUriOfSize(64, mime), PERSON_CODES).mime).toBe(mime);
  });

  it.each([
    [undefined, "PERSON_MISSING"],
    [null, "PERSON_MISSING"],
    ["", "PERSON_MISSING"],
    [42, "PERSON_MISSING"],
  ])("reports %s as missing", (value, code) => {
    expect(() => validateImageDataUri(value, PERSON_CODES)).toThrowError(
      expect.objectContaining({ code }),
    );
  });

  it("rejects a format the model cannot read", () => {
    expect(() => validateImageDataUri(dataUriOfSize(64, "image/gif"), PERSON_CODES)).toThrowError(
      expect.objectContaining({ code: "PERSON_FORMAT" }),
    );
  });

  it("rejects anything that is not a data URI", () => {
    expect(() => validateImageDataUri("hello", PERSON_CODES)).toThrowError(ValidationError);
  });

  it("refuses a remote URL, which would let a caller aim our server at any host", () => {
    for (const url of [
      "https://example.com/photo.jpg",
      "http://169.254.169.254/latest/meta-data/",
      "file:///etc/passwd",
    ]) {
      expect(() => validateImageDataUri(url, PERSON_CODES)).toThrowError(
        expect.objectContaining({ code: "PERSON_FORMAT" }),
      );
    }
  });

  it("rejects a payload over the size ceiling", () => {
    const tooBig = dataUriOfSize(MAX_IMAGE_BYTES + 1024);
    expect(() => validateImageDataUri(tooBig, PERSON_CODES)).toThrowError(
      expect.objectContaining({ code: "PERSON_TOO_LARGE" }),
    );
  });

  it("passes the limit along so the message can name it", () => {
    try {
      validateImageDataUri(dataUriOfSize(MAX_IMAGE_BYTES + 1024), PERSON_CODES);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as ValidationError).params.maxMb).toBe(MAX_IMAGE_BYTES / 1024 / 1024);
    }
  });

  it("reports garment problems with garment codes, not person ones", () => {
    expect(() => validateImageDataUri("", GARMENT_CODES)).toThrowError(
      expect.objectContaining({ code: "GARMENT_MISSING" }),
    );
  });

  it("tolerates whitespace inside base64, which some clients insert", () => {
    const [header, payload] = PIXEL_PNG.split(",");
    const wrapped = `${header},${payload.slice(0, 20)}\n${payload.slice(20)}`;
    expect(validateImageDataUri(wrapped, PERSON_CODES).dataUri).toBe(PIXEL_PNG);
  });
});
