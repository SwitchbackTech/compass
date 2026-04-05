const OBJECT_NOT_FOUND_UPDATE_SIGNATURE =
  "Object Not Found Matching Id:1, MethodName:update, ParamCount:4";

type PosthogBeforeSendEvent = {
  event?: string;
  properties?: {
    $exception_values?: unknown;
  };
};

function getExceptionValues(exceptionValues: unknown): string[] {
  if (!Array.isArray(exceptionValues)) {
    return [];
  }

  return exceptionValues.filter(
    (exceptionValue): exceptionValue is string =>
      typeof exceptionValue === "string",
  );
}

export function filterPosthogExceptionEvent(
  event: PosthogBeforeSendEvent,
): PosthogBeforeSendEvent | null {
  if (event.event !== "$exception") {
    return event;
  }

  const exceptionValues = getExceptionValues(
    event.properties?.$exception_values,
  );

  if (
    exceptionValues.some((exceptionValue) =>
      exceptionValue.includes(OBJECT_NOT_FOUND_UPDATE_SIGNATURE),
    )
  ) {
    return null;
  }

  return event;
}
