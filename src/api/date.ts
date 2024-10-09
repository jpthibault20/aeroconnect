"use server"

export const getDate = async () => {
    const currentDate = new Date();
    

    return {
        currentDate
    }

}