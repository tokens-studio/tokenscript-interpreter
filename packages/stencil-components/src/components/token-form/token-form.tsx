import { Component, type EventEmitter, Event, Prop, State, h } from "@stencil/core";
import { processTokens, type Config, type TokenData } from "@tokens-studio/tokenscript-interpreter";

export interface TokenFormData {
  name: string;
  value: string;
}

export interface TokenFormSubmitEvent {
  data: TokenFormData;
}

export interface TokenFormCancelEvent {
  reason?: string;
}

@Component({
  tag: "token-form",
  styleUrl: "token-form.css",
  shadow: true,
})
export class TokenForm {
  @Prop() initialData?: TokenFormData;
  @Prop() allTokens: Map<string, TokenData> = new Map();
  @Prop() config?: Config;
  @Prop() tokenType: string = "string";
  @Prop() submitHandler?: (data: TokenFormData) => void;
  @Prop() cancelHandler?: () => void;

  @State() formData: TokenFormData = {
    name: "",
    value: "",
  };
  @State() resolvedValue: string = "";
  @State() resolveError: Error | null = null;

  @Event() formSubmit: EventEmitter<TokenFormSubmitEvent>;
  @Event() formCancel: EventEmitter<TokenFormCancelEvent>;

  componentWillLoad() {
    if (this.initialData) {
      this.formData = { ...this.initialData };
    }
    this.computeResolvedValue();
  }

  private formatResolvedValue(value: unknown): string {
    if (value === null || value === undefined) return String(value);
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  private computeResolvedValue = () => {
    const previewName = this.formData.name.trim() || "";
    const previewTokens = new Map(this.allTokens);

    previewTokens.set(previewName, {
      $value: this.formData.value,
      $type: this.tokenType,
    });

    try {
      const result = processTokens<Map<string, unknown>>(previewTokens, {
        config: this.config,
      });
      const resolved = result.tokens.get(previewName);
      this.resolvedValue = this.formatResolvedValue(resolved);
      this.resolveError = null;
    } catch (error) {
      this.resolveError = error as Error;
      this.resolvedValue = "";
    }
  };

  handleSubmit = (e: Event) => {
    e.preventDefault();
    this.formSubmit.emit({ data: this.formData });
    if (this.submitHandler) {
      this.submitHandler(this.formData);
    }
  };

  handleCancel = () => {
    this.formCancel.emit({});
    if (this.cancelHandler) {
      this.cancelHandler();
    }
  };

  handleInputChange = (field: keyof TokenFormData, value: string) => {
    this.formData = {
      ...this.formData,
      [field]: value,
    };
    this.computeResolvedValue();
  };

  render() {
    return (
      <form
        class="token-form"
        part="form"
        onSubmit={this.handleSubmit}
      >
        <div class="token-form__field" part="field">
          <label
            htmlFor="token-name"
            class="token-form__label"
            part="label"
          >
            Name
          </label>
          <input
            id="token-name"
            type="text"
            class="token-form__input"
            part="input"
            value={this.formData.name}
            onInput={(e) => this.handleInputChange("name", (e.target as HTMLInputElement).value)}
            required
          />
        </div>

        <div class="token-form__field" part="field">
          <label
            htmlFor="token-value"
            class="token-form__label"
            part="label"
          >
            Value
          </label>
          <input
            id="token-value"
            type="text"
            class="token-form__input"
            part="input"
            value={this.formData.value}
            onInput={(e) => this.handleInputChange("value", (e.target as HTMLInputElement).value)}
            required
          />
          <div class="token-form__resolved" part="resolved">
            {this.resolveError ? (
              <span class="token-form__resolved--error" part="resolved-error">
                Error: {this.resolveError.message}
              </span>
            ) : (
              <span class="token-form__resolved--success" part="resolved-success">
                Resolved: {this.resolvedValue}
              </span>
            )}
          </div>
        </div>

        <div class="token-form__actions" part="actions">
          <button
            type="button"
            class="token-form__button token-form__button--cancel"
            part="button button-cancel"
            onClick={this.handleCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="token-form__button token-form__button--submit"
            part="button button-submit"
            onSubmit={this.handleSubmit}
          >
            Submit
          </button>
        </div>
      </form>
    );
  }
}
