"use server"

export const getDate = async () => {
    const currentDate = new Date();

    // const timezoneOffsetInMinutes = currentDate.getTimezoneOffset();
    // const timezoneOffsetInHours = -(timezoneOffsetInMinutes / 60);

    // currentDate.setHours(currentDate.getHours() + timezoneOffsetInHours);
    // console.log(currentDate);

    return {
        date: currentDate,
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        day: currentDate.getDate(),
        hour: currentDate.getHours(),
        minute: currentDate.getMinutes(),
        second: currentDate.getSeconds(),
    }
}