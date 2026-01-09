export default function DisqualifiedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-4">Disqualified</h1>
      <p className="text-xl text-center">
        You have exceeded the maximum number of allowed strikes.
        Your exam has been terminated.
      </p>
    </div>
  );
}
