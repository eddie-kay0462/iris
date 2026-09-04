import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PhoneInput from "./PhoneInput";

/**
 * The country selector used to be inert: `activeEntry` was recomputed from
 * `defaultCountry` on every render, so the picked country was never read and
 * every number was displayed as though it were Ghanaian — a stored "+1..."
 * came out as "0+1...".
 */

function setup(props: Partial<React.ComponentProps<typeof PhoneInput>> = {}) {
  const onChange = vi.fn();
  const utils = render(<PhoneInput value="" onChange={onChange} {...props} />);
  const input = screen.getByRole("textbox") as HTMLInputElement;
  const select = screen.getByLabelText("Country dial code") as HTMLSelectElement;
  return { onChange, input, select, ...utils };
}

describe("PhoneInput", () => {
  it("defaults to Ghana for an empty value", () => {
    const { select } = setup();
    expect(select.value).toBe("GH");
  });

  it("shows a Ghanaian number with its trunk prefix", () => {
    const { input, select } = setup({ value: "+233241234567" });
    expect(select.value).toBe("GH");
    expect(input.value).toBe("0241234567");
  });

  it("shows a foreign number under its own country, not Ghana", () => {
    const { input, select } = setup({ value: "+1234567890" });
    expect(select.value).toBe("US");
    expect(input.value).toBe("234567890");
  });

  it("lets the shopper change the country", () => {
    const { select, onChange } = setup({ value: "+233241234567" });
    fireEvent.change(select, { target: { value: "GB" } });
    expect(select.value).toBe("GB");
    expect(onChange).toHaveBeenCalledWith("+44241234567");
  });

  it("keeps the picked country even when defaultCountry says otherwise", () => {
    const { select, rerender, onChange } = setup({ value: "", defaultCountry: "GH" });
    fireEvent.change(select, { target: { value: "NL" } });
    rerender(<PhoneInput value="" onChange={onChange} defaultCountry="GH" />);
    expect((screen.getByLabelText("Country dial code") as HTMLSelectElement).value).toBe("NL");
  });

  it("follows defaultCountry while the field is empty and untouched", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PhoneInput value="" onChange={onChange} defaultCountry="GH" />,
    );
    rerender(<PhoneInput value="" onChange={onChange} defaultCountry="GB" />);
    expect((screen.getByLabelText("Country dial code") as HTMLSelectElement).value).toBe("GB");
  });

  it("combines the dial code with typed digits, dropping the trunk prefix", () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: "0241234567" } });
    expect(onChange).toHaveBeenCalledWith("+233241234567");
  });

  it("emits an empty string when the field is cleared", () => {
    const { input, onChange } = setup({ value: "+233241234567" });
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("shows an unrecognised dial code as-is rather than mangling it", () => {
    const { input } = setup({ value: "+49301234567" });
    expect(input.value).toBe("+49301234567");
  });
});
