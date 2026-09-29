// SmartTransit brand logo. On dark backgrounds, pass `onDark` to use the variant
// with a white wordmark and bus so it stays readable.
export default function Logo({ className = "h-10", onDark = false }) {
  return (
    <img
      src={onDark ? "/logo-light.png" : "/logo.png"}
      alt="SmartTransit"
      className={`${className} w-auto`}
    />
  );
}
