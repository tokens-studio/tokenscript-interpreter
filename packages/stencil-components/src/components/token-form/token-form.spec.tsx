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

  it("initializes with initial data when provided", async () => {
    const initialData = {
      name: "primary.color",
      value: "#3b82f6",
    };

    const page = await newSpecPage({
      components: [TokenForm],
      template: () => <token-form initialData={initialData} />,
    });

    const component = page.rootInstance as TokenForm;
    expect(component.formData).toEqual(initialData);
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
          data: component.formData,
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
