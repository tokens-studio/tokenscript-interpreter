// biome-ignore lint: 'h' required for jsx
import { h } from "@stencil/core";
import { newSpecPage } from "@stencil/core/testing";
import { TokenForm } from "./token-form";

describe("token-form", () => {
  it("renders with default state", async () => {
    const page = await newSpecPage({
      components: [TokenForm],
      html: `<token-form></token-form>`,
    });
    expect(page.root).toBeTruthy();
  });

  it("initializes with selected token when provided", async () => {
    const tokens = new Map([["primary.color", { $value: "#3b82f6", $type: "color" }]]);

    const page = await newSpecPage({
      components: [TokenForm],
      template: () => (
        <token-form
          tokens={tokens}
          selectedToken="primary.color"
        />
      ),
    });

    const component = page.rootInstance as TokenForm;
    expect(component.formData.name).toBe("primary.color");
    expect(component.formData.value).toBe("#3b82f6");
  });

  it("updates form data on input change", async () => {
    const page = await newSpecPage({
      components: [TokenForm],
      html: `<token-form></token-form>`,
    });

    const component = page.rootInstance as TokenForm;
    const input = page.root?.shadowRoot?.querySelector("#token-name") as HTMLInputElement;

    input.value = "test.token";
    input.dispatchEvent(new Event("input"));
    await page.waitForChanges();

    expect(component.formData.name).toBe("test.token");
  });

  it("emits formSubmit event on submit", async () => {
    const page = await newSpecPage({
      components: [TokenForm],
      html: `<token-form></token-form>`,
    });

    const component = page.rootInstance as TokenForm;
    component.formData = {
      name: "test.token",
      value: "#fff",
    };

    const submitSpy = jest.fn();
    page.root?.addEventListener("formSubmit", submitSpy);

    const form = page.root?.shadowRoot?.querySelector("form");
    form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await page.waitForChanges();

    expect(submitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: {
          data: {
            name: "test.token",
            token: {
              $value: "#fff",
              $type: "string",
            },
          },
        },
      }),
    );
  });

  it("emits formCancel event on cancel", async () => {
    const page = await newSpecPage({
      components: [TokenForm],
      html: `<token-form></token-form>`,
    });

    const cancelSpy = jest.fn();
    page.root?.addEventListener("formCancel", cancelSpy);

    const cancelButton = page.root?.shadowRoot?.querySelector(
      ".token-form__button--cancel",
    ) as HTMLButtonElement;
    cancelButton?.click();
    await page.waitForChanges();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it("renders all form fields", async () => {
    const page = await newSpecPage({
      components: [TokenForm],
      html: `<token-form></token-form>`,
    });

    const shadowRoot = page.root?.shadowRoot;
    expect(shadowRoot?.querySelector("#token-name")).toBeTruthy();
    expect(shadowRoot?.querySelector("#token-value")).toBeTruthy();
  });

  it("has required attributes on required fields", async () => {
    const page = await newSpecPage({
      components: [TokenForm],
      html: `<token-form></token-form>`,
    });

    const shadowRoot = page.root?.shadowRoot;
    const nameInput = shadowRoot?.querySelector("#token-name") as HTMLInputElement;
    const valueInput = shadowRoot?.querySelector("#token-value") as HTMLInputElement;

    expect(nameInput.required).toBe(true);
    expect(valueInput.required).toBe(true);
  });
});
