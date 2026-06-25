"use client";
import { useForm } from "react-hook-form";

type Test = {
  name: string;
  email: string;
};
export default function MyForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Test>();

  function onSubmit(data: Test) {
    console.log(data);
  }

  return (
    <form className=" container" onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register("name", { required: "اسم الزامی است" })}
        placeholder="اسمت رو بنویس"
      />
      {errors.name && <p style={{ color: "red" }}>{errors.name.message}</p>}
      <input {...register("email")} placeholder="اسمت رو بنویس" />
      <button type="submit">ارسال</button>
    </form>
  );
}
