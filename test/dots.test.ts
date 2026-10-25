import "mocha";
import { expect } from "chai";
import { Dots_score } from "../src/models/dots";

describe("Dots_score", () => {
  it("matches published DOTS values", () => {
    expect(Dots_score(600, 90, "male")).to.be.closeTo(387.96, 0.01);
    expect(Dots_score(360, 75, "male")).to.be.closeTo(258.27, 0.01);
    expect(Dots_score(400, 60, "female")).to.be.closeTo(443.42, 0.01);
  });

  it("scores the same total higher at a lighter bodyweight", () => {
    expect(Dots_score(405, 67.5, "male")).to.be.greaterThan(Dots_score(405, 75, "male"));
  });

  it("clamps bodyweight to the formula's valid range", () => {
    expect(Dots_score(500, 250, "male")).to.equal(Dots_score(500, 210, "male"));
    expect(Dots_score(300, 30, "female")).to.equal(Dots_score(300, 40, "female"));
  });
});
