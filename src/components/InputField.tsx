import { FieldError } from "react-hook-form";

type InputFieldProps = {
  label: string;
  type?: string;
  register: any;
  name: string;
  defaultValue?: string;
  error?: FieldError;
  hidden?: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

const InputField = ({
  label,
  type = "text",
  register,
  name,
  defaultValue,
  error,
  hidden,
  inputProps,
}: InputFieldProps) => {
  return (
    <div className={hidden ? "hidden" : "flex flex-col gap-2 w-full md:min-w-[200px] md:flex-1"}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        {...register(name)}
        className="px-3 py-2.5 rounded-[6px] text-sm w-full bg-background text-foreground shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px] outline-none focus:ring-1 focus:ring-ring transition-all placeholder:text-muted-foreground"
        {...inputProps}
        defaultValue={defaultValue}
        onClick={(e) => {
          if (type === "date" || type === "datetime-local") {
            try {
              (e.target as HTMLInputElement).showPicker();
            } catch (err) {}
          }
        }}
      />
      {error?.message && (
        <p className="text-xs text-red-500">{error.message.toString()}</p>
      )}
    </div>
  );
};

export default InputField;

