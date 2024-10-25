const React = require('react');
const { Card, CardHeader, CardBody, Skeleton } = require('@nextui-org/react');

const AnimeCardSkeleton = () => {
  return (
    <Card className="w-[208px] h-[340px]">
      <CardBody className="p-0 relative">
        <Skeleton className="w-full rounded-t-lg">
          <div className="aspect-[9/14] rounded-t-lg bg-default-300"></div>
        </Skeleton>
        <Skeleton className="absolute top-2 right-2 rounded-full">
          <div className="h-6 w-20 rounded-full bg-default-200"></div>
        </Skeleton>
      </CardBody>
      <CardHeader className="flex flex-col items-start p-3">
        <Skeleton className="w-3/4 rounded-lg">
          <div className="h-5 rounded-lg bg-default-200"></div>
        </Skeleton>
        <div className="flex justify-between items-center w-full mt-2">
          <Skeleton className="w-1/3 rounded-lg">
            <div className="h-4 rounded-lg bg-default-100"></div>
          </Skeleton>
          <Skeleton className="w-1/3 rounded-lg">
            <div className="h-4 rounded-lg bg-default-100"></div>
          </Skeleton>
        </div>
      </CardHeader>
    </Card>
  );
};

module.exports = AnimeCardSkeleton;
